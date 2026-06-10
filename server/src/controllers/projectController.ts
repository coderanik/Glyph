import type { Context } from 'hono';
import { getAuth } from '@hono/clerk-auth';
import { query } from '../config/db.js';
import crypto from 'crypto';
import { forceSaveRoom } from '../config/yjsServer.js';
import path from 'path';

interface Project {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  role: string;
  ownerName?: string;
  ownerFirstName?: string;
}

interface Collaborator {
  id: string;
  name: string;
  initials: string;
  color: string;
  email: string | null;
  imageUrl: string | null;
  role: 'owner' | 'collaborator';
  permission: 'write' | 'read';
  online: boolean;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

function isSafeFilePath(filePath: string): boolean {
  if (!filePath) return false;
  // Normalize path using path.posix since the server/workers run in Linux Docker containers
  const normalized = path.posix.normalize(filePath);
  
  if (path.posix.isAbsolute(normalized) || normalized.startsWith('..') || normalized.includes('..')) {
    return false;
  }
  return true;
}

async function checkProjectAccess(projectId: string, userId: string): Promise<'write' | 'read' | null> {
  try {
    // Check if owner
    const projRes = await query('SELECT owner_id FROM projects WHERE id = $1', [projectId]);
    if (projRes.rows.length === 0) return null;
    if (projRes.rows[0].owner_id === userId) return 'write';

    // Check if collaborator
    const collabRes = await query(
      'SELECT permission FROM project_collaborators WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );
    if (collabRes.rows.length > 0) {
      return collabRes.rows[0].permission as 'write' | 'read';
    }
  } catch (err) {
    console.error('Error checking project access:', err);
  }
  return null;
}

// --- CONTROLLERS ---

// GET /projects
export async function getProjects(c: Context) {
  const auth = getAuth(c);
  const userId = auth?.userId;
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const result = await query(
      `SELECT p.id, p.name, p.owner_id AS "ownerId", p.created_at AS "createdAt",
              CASE WHEN p.owner_id = $1 THEN 'owner' ELSE pc.permission END AS "role"
       FROM projects p
       LEFT JOIN project_collaborators pc ON p.id = pc.project_id AND pc.user_id = $1
       WHERE p.owner_id = $1 OR pc.user_id = $1
       ORDER BY p.created_at DESC`,
      [userId]
    );

    const clerkClient = c.get('clerk');
    const projects: Project[] = [];
    const ownerCache = new Map<string, { ownerName: string; ownerFirstName: string }>();

    for (const row of result.rows) {
      const p = { ...row };
      if (p.ownerId === userId) {
        p.ownerName = 'You';
        p.ownerFirstName = 'You';
      } else {
        if (ownerCache.has(p.ownerId)) {
          const cached = ownerCache.get(p.ownerId)!;
          p.ownerName = cached.ownerName;
          p.ownerFirstName = cached.ownerFirstName;
        } else {
          try {
            const u = await clerkClient.users.getUser(p.ownerId);
            const fullName = [u.firstName, u.lastName].filter((n): n is string => !!n).join(' ') || u.emailAddresses?.[0]?.emailAddress || 'Collaborator';
            const firstName = u.firstName || 'Collaborator';
            ownerCache.set(p.ownerId, { ownerName: fullName, ownerFirstName: firstName });
            p.ownerName = fullName;
            p.ownerFirstName = firstName;
          } catch (clerkErr) {
            p.ownerName = 'Collaborator';
            p.ownerFirstName = 'owner';
          }
        }
      }
      projects.push(p);
    }

    return c.json(projects);
  } catch (err) {
    console.error('Error fetching projects:', err);
    return c.json({ error: 'Database error', details: err instanceof Error ? err.message : String(err) }, 500);
  }
}

// POST /projects
export async function createProject(c: Context) {
  const auth = getAuth(c);
  const userId = auth?.userId;
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const body = await c.req.json();
    const name = body.name || 'Untitled Project';

    const result = await query(
      'INSERT INTO projects (name, owner_id) VALUES ($1, $2) RETURNING id, name, owner_id AS "ownerId", created_at AS "createdAt"',
      [name, userId]
    );
    
    return c.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating project:', err);
    return c.json({ error: 'Database error', details: err instanceof Error ? err.message : String(err) }, 500);
  }
}

// GET /projects/:projectId/files
export async function getFiles(c: Context) {
  const auth = getAuth(c);
  const userId = auth?.userId;
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const projectId = c.req.param('projectId');
  if (!projectId) return c.json({ error: 'Project ID is required' }, 400);

  // Check access
  const access = await checkProjectAccess(projectId, userId);
  if (!access) return c.json({ error: 'Forbidden' }, 403);

  try {
    const result = await query(
      'SELECT id, project_id AS "projectId", name, path, content, created_at AS "createdAt", updated_at AS "updatedAt" FROM files WHERE project_id = $1',
      [projectId]
    );
    return c.json(result.rows);
  } catch (err) {
    console.error('Error fetching files:', err);
    return c.json({ error: 'Database error', details: err instanceof Error ? err.message : String(err) }, 500);
  }
}

// POST /projects/:projectId/files
export async function createFile(c: Context) {
  const auth = getAuth(c);
  const userId = auth?.userId;
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const projectId = c.req.param('projectId');
  if (!projectId) return c.json({ error: 'Project ID is required' }, 400);

  // Check access - must have write permission
  const access = await checkProjectAccess(projectId, userId);
  if (access !== 'write') {
    return c.json({ error: 'Forbidden: Read-Only access' }, 403);
  }

  try {
    const body = await c.req.json();
    const name = body.name;
    const filePath = body.path || name;
    const content = body.content || '';

    if (!name) {
      return c.json({ error: 'File name is required' }, 400);
    }

    if (!isSafeFilePath(filePath)) {
      return c.json({ error: 'Forbidden: Invalid or traversal file path' }, 400);
    }

    // Upsert the file content
    const result = await query(
      `INSERT INTO files (project_id, name, path, content, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (project_id, path)
       DO UPDATE SET content = EXCLUDED.content, updated_at = CURRENT_TIMESTAMP
       RETURNING id, project_id AS "projectId", name, path, content, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [projectId, name, filePath, content]
    );

    return c.json(result.rows[0]);
  } catch (err) {
    console.error('Error saving file:', err);
    return c.json({ error: 'Database error', details: err instanceof Error ? err.message : String(err) }, 500);
  }
}

// POST /projects/:projectId/compile
export async function compileProject(c: Context) {
  const auth = getAuth(c);
  const userId = auth?.userId;
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const projectId = c.req.param('projectId');
  if (!projectId) return c.json({ error: 'Project ID is required' }, 400);

  // Check access - must have write permission
  const access = await checkProjectAccess(projectId, userId);
  if (access !== 'write') {
    return c.json({ error: 'Forbidden: Read-Only access' }, 403);
  }

  try {
    // Force-save any active Yjs rooms for this project to the DB before compilation
    const filesRes = await query('SELECT id FROM files WHERE project_id = $1', [projectId]);
    for (const row of filesRes.rows) {
      await forceSaveRoom(row.id);
    }

    const result = await query(
      "INSERT INTO compilation_jobs (project_id, status, logs) VALUES ($1, $2, $3) RETURNING id",
      [projectId, 'queued', 'Job queued...']
    );
    const jobId = result.rows[0].id;

    return c.json({ job_id: jobId });
  } catch (err) {
    console.error('Error spawning compilation job:', err);
    return c.json({ error: 'Database error', details: err instanceof Error ? err.message : String(err) }, 500);
  }
}


// GET /projects/:projectId/jobs/:jobId
export async function getJobStatus(c: Context) {
  const auth = getAuth(c);
  const userId = auth?.userId;
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const projectId = c.req.param('projectId');
  const jobId = c.req.param('jobId');
  if (!projectId) return c.json({ error: 'Project ID is required' }, 400);
  if (!jobId) return c.json({ error: 'Job ID is required' }, 400);

  // Check access
  const access = await checkProjectAccess(projectId, userId);
  if (!access) return c.json({ error: 'Forbidden' }, 403);

  try {
    const result = await query(
      'SELECT status, logs, pdf_url FROM compilation_jobs WHERE id = $1',
      [jobId]
    );

    if (result.rows.length === 0) {
      return c.json({ error: 'Job not found' }, 404);
    }

    return c.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching job status:', err);
    return c.json({ error: 'Database error', details: err instanceof Error ? err.message : String(err) }, 500);
  }
}

// GET /projects/:projectId/jobs/:jobId/pdf
export async function getJobPdf(c: Context) {
  const auth = getAuth(c);
  const userId = auth?.userId;
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const projectId = c.req.param('projectId');
  const jobId = c.req.param('jobId');
  if (!projectId) return c.json({ error: 'Project ID is required' }, 400);
  if (!jobId) return c.json({ error: 'Job ID is required' }, 400);

  // Check access
  const access = await checkProjectAccess(projectId, userId);
  if (!access) return c.text('Forbidden', 403);

  try {
    const result = await query('SELECT pdf_data FROM compilation_jobs WHERE id = $1', [jobId]);

    if (result.rows.length === 0 || !result.rows[0].pdf_data) {
      return c.text('PDF not found', 404);
    }

    const pdfBytes = result.rows[0].pdf_data;
    
    c.header('Content-Type', 'application/pdf');
    c.header('Content-Disposition', `inline; filename="${jobId}.pdf"`);
    return c.body(pdfBytes);
  } catch (err) {
    console.error('Error downloading PDF:', err);
    return c.text('Internal Server Error', 500);
  }
}

// POST /projects/:projectId/share
export async function createShareLink(c: Context) {
  const auth = getAuth(c);
  const userId = auth?.userId;
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const projectId = c.req.param('projectId');
  if (!projectId) return c.json({ error: 'Project ID is required' }, 400);

  try {
    // Only the project owner can generate share links
    const projRes = await query('SELECT owner_id FROM projects WHERE id = $1', [projectId]);
    if (projRes.rows.length === 0) {
      return c.json({ error: 'Project not found' }, 404);
    }
    if (projRes.rows[0].owner_id !== userId) {
      return c.json({ error: 'Forbidden: Only the owner can invite collaborators' }, 403);
    }

    const body = await c.req.json();
    const permission = body.permission === 'write' ? 'write' : 'read';
    const token = crypto.randomUUID();

    await query(
      `INSERT INTO share_links (project_id, permission, token)
       VALUES ($1, $2, $3)`,
      [projectId, permission, token]
    );

    return c.json({ token, permission });
  } catch (err) {
    console.error('Error creating share link:', err);
    return c.json({ error: 'Database error', details: err instanceof Error ? err.message : String(err) }, 500);
  }
}

// POST /projects/share/accept
export async function acceptShareLink(c: Context) {
  const auth = getAuth(c);
  const userId = auth?.userId;
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const body = await c.req.json();
    const token = body.token;
    if (!token) return c.json({ error: 'Token is required' }, 400);

    const shareRes = await query(
      'SELECT project_id, permission FROM share_links WHERE token = $1',
      [token]
    );
    if (shareRes.rows.length === 0) {
      return c.json({ error: 'Invalid or expired sharing token' }, 400);
    }

    const { project_id: projectId, permission } = shareRes.rows[0];

    // Check if the user is already the owner
    const projRes = await query('SELECT owner_id FROM projects WHERE id = $1', [projectId]);
    if (projRes.rows.length > 0 && projRes.rows[0].owner_id === userId) {
      return c.json({ projectId, message: 'You are the owner of this project' });
    }

    // Insert user into collaborators (ignore conflict if already collaborator)
    await query(
      `INSERT INTO project_collaborators (project_id, user_id, permission)
       VALUES ($1, $2, $3)
       ON CONFLICT (project_id, user_id)
       DO UPDATE SET permission = EXCLUDED.permission`,
      [projectId, userId, permission]
    );

    return c.json({ projectId });
  } catch (err) {
    console.error('Error accepting share link:', err);
    return c.json({ error: 'Database error', details: err instanceof Error ? err.message : String(err) }, 500);
  }
}

// GET /projects/:projectId/collaborators
export async function getProjectCollaborators(c: Context) {
  const auth = getAuth(c);
  const userId = auth?.userId;
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const projectId = c.req.param('projectId');
  if (!projectId) return c.json({ error: 'Project ID is required' }, 400);

  // Check access
  const access = await checkProjectAccess(projectId, userId);
  if (!access) return c.json({ error: 'Forbidden' }, 403);

  try {
    // 1. Get Owner ID
    const ownerRes = await query('SELECT owner_id FROM projects WHERE id = $1', [projectId]);
    if (ownerRes.rows.length === 0) return c.json({ error: 'Project not found' }, 404);
    const ownerId = ownerRes.rows[0].owner_id;

    // 2. Get Collaborators
    const collabRes = await query(
      'SELECT user_id AS "userId", permission FROM project_collaborators WHERE project_id = $1',
      [projectId]
    );

    const clerkClient = c.get('clerk');
    const collaboratorsList: Collaborator[] = [];

    // Helper function to fetch clerk user details safely
    const fetchUser = async (uid: string) => {
      try {
        const u = await clerkClient.users.getUser(uid);
        return {
          id: u.id,
          name: [u.firstName, u.lastName].filter((n): n is string => !!n).join(' ') || u.emailAddresses?.[0]?.emailAddress || 'Collaborator',
          initials: [u.firstName, u.lastName].filter((n): n is string => !!n).map((n: string) => n[0].toUpperCase()).join('') || 'CO',
          color: `#${crypto.createHash('md5').update(uid).digest('hex').substring(0, 6)}`,
          email: u.emailAddresses?.[0]?.emailAddress || null,
          imageUrl: u.imageUrl || null,
        };
      } catch (clerkErr) {
        // Fallback if Clerk fetch fails (e.g. user deleted or offline testing)
        return {
          id: uid,
          name: 'Collaborator',
          initials: 'CL',
          color: '#8b8b8b',
          email: null,
          imageUrl: null,
        };
      }
    };

    // Fetch details for owner
    const ownerDetails = await fetchUser(ownerId);
    collaboratorsList.push({
      ...ownerDetails,
      role: 'owner',
      permission: 'write',
      online: true,
    });

    // Fetch details for each collaborator
    for (const collab of collabRes.rows) {
      if (collab.userId === ownerId) continue;
      const userDetails = await fetchUser(collab.userId);
      collaboratorsList.push({
        ...userDetails,
        role: 'collaborator',
        permission: collab.permission as 'write' | 'read',
        online: false,
      });
    }

    return c.json(collaboratorsList);
  } catch (err) {
    console.error('Error fetching collaborators:', err);
    return c.json({ error: 'Database error', details: err instanceof Error ? err.message : String(err) }, 500);
  }
}

// POST /projects/:projectId/ai
export async function aiQuery(c: Context) {
  const auth = getAuth(c);
  const userId = auth?.userId;
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
 
  const projectId = c.req.param('projectId');
  if (!projectId) return c.json({ error: 'Project ID is required' }, 400);
  const role = await checkProjectAccess(projectId, userId);
  if (!role) return c.json({ error: 'Unauthorized' }, 401);
 
  try {
    const { prompt, fileContent, selectedText } = await c.req.json();
    if (!prompt || typeof prompt !== 'string') {
      return c.json({ error: 'Prompt is required' }, 400);
    }
 
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return c.json({
        text: "⚠️ **Gemini API Key is missing!**\n\nPlease set the `GEMINI_API_KEY` environment variable in your `server/.env` file and restart the development stack."
      });
    }
 
    const systemPrompt = `You are an expert LaTeX assistant. You have access to the current LaTeX code in the user's editor.
Your task is to help the user write, format, fix, or modify their LaTeX document.
 
Here is the content of the current active LaTeX file:
--- START FILE CONTENT ---
${fileContent || "(The file is currently empty)"}
--- END FILE CONTENT ---
${selectedText ? `\nHere is the user's currently selected text in the editor:\n--- START SELECTED TEXT ---\n${selectedText}\n--- END SELECTED TEXT ---\n` : ""}
 
When responding:
1. If the user asks for changes, edits, or fixes, output the corrected/new LaTeX block in a markdown code block starting with \`\`\`latex.
2. Write a clear, brief explanation of what you changed or how you fixed the issue.
3. Be precise. If the change only affects a small section, you can output just that section, but if the user asks you to rewrite or fix the whole file, you can output the entire file content. Indicate clearly in your text description whether the output code block is a complete replacement for the entire file or just a specific snippet/selection.
 
User Query: ${prompt}`;
 
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: systemPrompt }]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      return c.json({
        text: `⚠️ **Gemini API Error:** Failed to fetch from Gemini. Response status: ${response.status}. Details: ${errorText}`
      });
    }

    const data = await response.json() as GeminiResponse;
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!aiText) {
      return c.json({
        text: "⚠️ **No response received from Gemini.** Please check your API key and network connection."
      });
    }

    return c.json({ text: aiText });
  } catch (err) {
    console.error('Error in aiQuery:', err);
    return c.json({ error: 'AI server error', details: err instanceof Error ? err.message : String(err) }, 500);
  }
}
