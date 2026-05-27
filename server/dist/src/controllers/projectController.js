import { getAuth } from '@hono/clerk-auth';
import { query } from '../config/db.js';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
const DATA_DIR = path.resolve('.data');
const WORKSPACES_DIR = path.join(DATA_DIR, 'workspaces');
// Ensure workspace directory exists on load
fs.mkdir(WORKSPACES_DIR, { recursive: true }).catch(() => { });
async function checkProjectAccess(projectId, userId) {
    try {
        // Check if owner
        const projRes = await query('SELECT owner_id FROM projects WHERE id = $1', [projectId]);
        if (projRes.rows.length === 0)
            return null;
        if (projRes.rows[0].owner_id === userId)
            return 'write';
        // Check if collaborator
        const collabRes = await query('SELECT permission FROM project_collaborators WHERE project_id = $1 AND user_id = $2', [projectId, userId]);
        if (collabRes.rows.length > 0) {
            return collabRes.rows[0].permission;
        }
    }
    catch (err) {
        console.error('Error checking project access:', err);
    }
    return null;
}
// --- CONTROLLERS ---
// GET /projects
export async function getProjects(c) {
    const auth = getAuth(c);
    const userId = auth?.userId || c.req.header('X-Mock-User');
    if (!userId)
        return c.json({ error: 'Unauthorized' }, 401);
    try {
        const result = await query(`SELECT p.id, p.name, p.owner_id AS "ownerId", p.created_at AS "createdAt",
              CASE WHEN p.owner_id = $1 THEN 'owner' ELSE pc.permission END AS "role"
       FROM projects p
       LEFT JOIN project_collaborators pc ON p.id = pc.project_id AND pc.user_id = $1
       WHERE p.owner_id = $1 OR pc.user_id = $1
       ORDER BY p.created_at DESC`, [userId]);
        const clerkClient = c.get('clerk');
        const projects = [];
        const ownerCache = new Map();
        for (const row of result.rows) {
            const p = { ...row };
            if (p.ownerId === userId) {
                p.ownerName = 'You';
                p.ownerFirstName = 'You';
            }
            else {
                if (ownerCache.has(p.ownerId)) {
                    const cached = ownerCache.get(p.ownerId);
                    p.ownerName = cached.ownerName;
                    p.ownerFirstName = cached.ownerFirstName;
                }
                else {
                    try {
                        const u = await clerkClient.users.getUser(p.ownerId);
                        const fullName = [u.firstName, u.lastName].filter((n) => !!n).join(' ') || u.emailAddresses?.[0]?.emailAddress || 'Collaborator';
                        const firstName = u.firstName || 'Collaborator';
                        ownerCache.set(p.ownerId, { ownerName: fullName, ownerFirstName: firstName });
                        p.ownerName = fullName;
                        p.ownerFirstName = firstName;
                    }
                    catch (clerkErr) {
                        p.ownerName = 'Collaborator';
                        p.ownerFirstName = 'owner';
                    }
                }
            }
            projects.push(p);
        }
        return c.json(projects);
    }
    catch (err) {
        console.error('Error fetching projects:', err);
        return c.json({ error: 'Database error', details: err.message }, 500);
    }
}
// POST /projects
export async function createProject(c) {
    const auth = getAuth(c);
    const userId = auth?.userId || c.req.header('X-Mock-User');
    if (!userId)
        return c.json({ error: 'Unauthorized' }, 401);
    try {
        const body = await c.req.json();
        const name = body.name || 'Untitled Project';
        const result = await query('INSERT INTO projects (name, owner_id) VALUES ($1, $2) RETURNING id, name, owner_id AS "ownerId", created_at AS "createdAt"', [name, userId]);
        return c.json(result.rows[0]);
    }
    catch (err) {
        console.error('Error creating project:', err);
        return c.json({ error: 'Database error', details: err.message }, 500);
    }
}
// GET /projects/:projectId/files
export async function getFiles(c) {
    const auth = getAuth(c);
    const userId = auth?.userId || c.req.header('X-Mock-User');
    if (!userId)
        return c.json({ error: 'Unauthorized' }, 401);
    const projectId = c.req.param('projectId');
    if (!projectId)
        return c.json({ error: 'Project ID is required' }, 400);
    // Check access
    const access = await checkProjectAccess(projectId, userId);
    if (!access)
        return c.json({ error: 'Forbidden' }, 403);
    try {
        const result = await query('SELECT id, project_id AS "projectId", name, path, content, created_at AS "createdAt", updated_at AS "updatedAt" FROM files WHERE project_id = $1', [projectId]);
        return c.json(result.rows);
    }
    catch (err) {
        console.error('Error fetching files:', err);
        return c.json({ error: 'Database error', details: err.message }, 500);
    }
}
// POST /projects/:projectId/files
export async function createFile(c) {
    const auth = getAuth(c);
    const userId = auth?.userId || c.req.header('X-Mock-User');
    if (!userId)
        return c.json({ error: 'Unauthorized' }, 401);
    const projectId = c.req.param('projectId');
    if (!projectId)
        return c.json({ error: 'Project ID is required' }, 400);
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
        // Upsert the file content
        const result = await query(`INSERT INTO files (project_id, name, path, content, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (project_id, path)
       DO UPDATE SET content = EXCLUDED.content, updated_at = CURRENT_TIMESTAMP
       RETURNING id, project_id AS "projectId", name, path, content, created_at AS "createdAt", updated_at AS "updatedAt"`, [projectId, name, filePath, content]);
        return c.json(result.rows[0]);
    }
    catch (err) {
        console.error('Error saving file:', err);
        return c.json({ error: 'Database error', details: err.message }, 500);
    }
}
// POST /projects/:projectId/compile
export async function compileProject(c) {
    const auth = getAuth(c);
    const userId = auth?.userId || c.req.header('X-Mock-User');
    if (!userId)
        return c.json({ error: 'Unauthorized' }, 401);
    const projectId = c.req.param('projectId');
    if (!projectId)
        return c.json({ error: 'Project ID is required' }, 400);
    // Check access - must have write permission
    const access = await checkProjectAccess(projectId, userId);
    if (access !== 'write') {
        return c.json({ error: 'Forbidden: Read-Only access' }, 403);
    }
    try {
        const result = await query("INSERT INTO compilation_jobs (project_id, status, logs) VALUES ($1, $2, $3) RETURNING id", [projectId, 'queued', 'Job queued...']);
        const jobId = result.rows[0].id;
        // Background compilation process
        runCompilationBackground(projectId, jobId).catch((err) => {
            console.error(`Compilation job ${jobId} failed with system error:`, err);
        });
        return c.json({ job_id: jobId });
    }
    catch (err) {
        console.error('Error spawning compilation job:', err);
        return c.json({ error: 'Database error', details: err.message }, 500);
    }
}
// Background compile worker
async function runCompilationBackground(projectId, jobId) {
    try {
        await query("UPDATE compilation_jobs SET status = $1, logs = $2 WHERE id = $3", ['running', 'Compiling LaTeX files...\n', jobId]);
        const workspaceDir = path.join(WORKSPACES_DIR, jobId);
        await fs.mkdir(workspaceDir, { recursive: true });
        try {
            const filesRes = await query('SELECT path, content FROM files WHERE project_id = $1', [projectId]);
            const files = filesRes.rows;
            const mainFile = files.find((f) => f.path === 'main.tex');
            if (!mainFile) {
                throw new Error("main.tex not found in project. A 'main.tex' file is required for compilation.");
            }
            // Write all project files to workspace
            for (const f of files) {
                const fullPath = path.join(workspaceDir, f.path);
                await fs.mkdir(path.dirname(fullPath), { recursive: true });
                await fs.writeFile(fullPath, f.content || '');
            }
            const absoluteWorkspacePath = path.resolve(workspaceDir);
            // Call LaTeX compiler inside Docker container
            const dockerCmd = `docker run --rm -v "${absoluteWorkspacePath}":/workspace -w /workspace glyph-compiler /usr/local/bin/worker.sh main.tex`;
            let logs = '';
            let status = 'success';
            try {
                const { stdout, stderr } = await execAsync(dockerCmd);
                logs = stdout + '\n' + stderr;
            }
            catch (execErr) {
                logs = (execErr.stdout || '') + '\n' + (execErr.stderr || '') + '\n' + (execErr.message || '');
                status = 'failed';
            }
            if (status === 'success') {
                const compiledPdf = path.join(workspaceDir, 'main.pdf');
                if (existsSync(compiledPdf)) {
                    const pdfBytes = await fs.readFile(compiledPdf);
                    await query(`UPDATE compilation_jobs 
             SET status = $1, logs = $2, pdf_data = $3, pdf_url = $4, completed_at = CURRENT_TIMESTAMP 
             WHERE id = $5`, ['success', logs, pdfBytes, `/projects/${projectId}/jobs/${jobId}/pdf`, jobId]);
                }
                else {
                    await query(`UPDATE compilation_jobs 
             SET status = $1, logs = $2, completed_at = CURRENT_TIMESTAMP 
             WHERE id = $3`, ['failed', logs + '\nError: main.pdf was not produced by latexmk.', jobId]);
                }
            }
            else {
                await query(`UPDATE compilation_jobs 
           SET status = $1, logs = $2, completed_at = CURRENT_TIMESTAMP 
           WHERE id = $3`, ['failed', logs, jobId]);
            }
        }
        catch (err) {
            await query(`UPDATE compilation_jobs 
         SET status = $1, logs = $2, completed_at = CURRENT_TIMESTAMP 
         WHERE id = $3`, ['failed', `System Error: ${err.message || err}`, jobId]);
        }
        finally {
            // Clean up workspace
            try {
                await fs.rm(workspaceDir, { recursive: true, force: true });
            }
            catch (cleanupErr) {
                console.error(`Failed to clean up workspace ${workspaceDir}:`, cleanupErr);
            }
        }
    }
    catch (dbErr) {
        console.error(`Fatal database logging error for job ${jobId}:`, dbErr);
    }
}
// GET /projects/:projectId/jobs/:jobId
export async function getJobStatus(c) {
    const auth = getAuth(c);
    const userId = auth?.userId || c.req.header('X-Mock-User');
    if (!userId)
        return c.json({ error: 'Unauthorized' }, 401);
    const projectId = c.req.param('projectId');
    const jobId = c.req.param('jobId');
    if (!projectId)
        return c.json({ error: 'Project ID is required' }, 400);
    if (!jobId)
        return c.json({ error: 'Job ID is required' }, 400);
    // Check access
    const access = await checkProjectAccess(projectId, userId);
    if (!access)
        return c.json({ error: 'Forbidden' }, 403);
    try {
        const result = await query('SELECT status, logs, pdf_url FROM compilation_jobs WHERE id = $1', [jobId]);
        if (result.rows.length === 0) {
            return c.json({ error: 'Job not found' }, 404);
        }
        return c.json(result.rows[0]);
    }
    catch (err) {
        console.error('Error fetching job status:', err);
        return c.json({ error: 'Database error', details: err.message }, 500);
    }
}
// GET /projects/:projectId/jobs/:jobId/pdf
export async function getJobPdf(c) {
    const auth = getAuth(c);
    const userId = auth?.userId || c.req.header('X-Mock-User');
    if (!userId)
        return c.json({ error: 'Unauthorized' }, 401);
    const projectId = c.req.param('projectId');
    const jobId = c.req.param('jobId');
    if (!projectId)
        return c.json({ error: 'Project ID is required' }, 400);
    if (!jobId)
        return c.json({ error: 'Job ID is required' }, 400);
    // Check access
    const access = await checkProjectAccess(projectId, userId);
    if (!access)
        return c.text('Forbidden', 403);
    try {
        const result = await query('SELECT pdf_data FROM compilation_jobs WHERE id = $1', [jobId]);
        if (result.rows.length === 0 || !result.rows[0].pdf_data) {
            return c.text('PDF not found', 404);
        }
        const pdfBytes = result.rows[0].pdf_data;
        c.header('Content-Type', 'application/pdf');
        c.header('Content-Disposition', `inline; filename="${jobId}.pdf"`);
        return c.body(pdfBytes);
    }
    catch (err) {
        console.error('Error downloading PDF:', err);
        return c.text('Internal Server Error', 500);
    }
}
// POST /projects/:projectId/share
export async function createShareLink(c) {
    const auth = getAuth(c);
    const userId = auth?.userId || c.req.header('X-Mock-User');
    if (!userId)
        return c.json({ error: 'Unauthorized' }, 401);
    const projectId = c.req.param('projectId');
    if (!projectId)
        return c.json({ error: 'Project ID is required' }, 400);
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
        await query(`INSERT INTO share_links (project_id, permission, token)
       VALUES ($1, $2, $3)`, [projectId, permission, token]);
        return c.json({ token, permission });
    }
    catch (err) {
        console.error('Error creating share link:', err);
        return c.json({ error: 'Database error', details: err.message }, 500);
    }
}
// POST /projects/share/accept
export async function acceptShareLink(c) {
    const auth = getAuth(c);
    const userId = auth?.userId || c.req.header('X-Mock-User');
    if (!userId)
        return c.json({ error: 'Unauthorized' }, 401);
    try {
        const body = await c.req.json();
        const token = body.token;
        if (!token)
            return c.json({ error: 'Token is required' }, 400);
        const shareRes = await query('SELECT project_id, permission FROM share_links WHERE token = $1', [token]);
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
        await query(`INSERT INTO project_collaborators (project_id, user_id, permission)
       VALUES ($1, $2, $3)
       ON CONFLICT (project_id, user_id)
       DO UPDATE SET permission = EXCLUDED.permission`, [projectId, userId, permission]);
        return c.json({ projectId });
    }
    catch (err) {
        console.error('Error accepting share link:', err);
        return c.json({ error: 'Database error', details: err.message }, 500);
    }
}
// GET /projects/:projectId/collaborators
export async function getProjectCollaborators(c) {
    const auth = getAuth(c);
    const userId = auth?.userId || c.req.header('X-Mock-User');
    if (!userId)
        return c.json({ error: 'Unauthorized' }, 401);
    const projectId = c.req.param('projectId');
    if (!projectId)
        return c.json({ error: 'Project ID is required' }, 400);
    // Check access
    const access = await checkProjectAccess(projectId, userId);
    if (!access)
        return c.json({ error: 'Forbidden' }, 403);
    try {
        // 1. Get Owner ID
        const ownerRes = await query('SELECT owner_id FROM projects WHERE id = $1', [projectId]);
        if (ownerRes.rows.length === 0)
            return c.json({ error: 'Project not found' }, 404);
        const ownerId = ownerRes.rows[0].owner_id;
        // 2. Get Collaborators
        const collabRes = await query('SELECT user_id AS "userId", permission FROM project_collaborators WHERE project_id = $1', [projectId]);
        const clerkClient = c.get('clerk');
        const collaboratorsList = [];
        // Helper function to fetch clerk user details safely
        const fetchUser = async (uid) => {
            try {
                const u = await clerkClient.users.getUser(uid);
                return {
                    id: u.id,
                    name: [u.firstName, u.lastName].filter((n) => !!n).join(' ') || u.emailAddresses?.[0]?.emailAddress || 'Collaborator',
                    initials: [u.firstName, u.lastName].filter((n) => !!n).map((n) => n[0].toUpperCase()).join('') || 'CO',
                    color: `#${crypto.createHash('md5').update(uid).digest('hex').substring(0, 6)}`,
                    email: u.emailAddresses?.[0]?.emailAddress || null,
                };
            }
            catch (clerkErr) {
                // Fallback if Clerk fetch fails (e.g. user deleted or offline testing)
                return {
                    id: uid,
                    name: 'Collaborator',
                    initials: 'CL',
                    color: '#8b8b8b',
                    email: null,
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
            if (collab.userId === ownerId)
                continue;
            const userDetails = await fetchUser(collab.userId);
            collaboratorsList.push({
                ...userDetails,
                role: 'collaborator',
                permission: collab.permission,
                online: false,
            });
        }
        return c.json(collaboratorsList);
    }
    catch (err) {
        console.error('Error fetching collaborators:', err);
        return c.json({ error: 'Database error', details: err.message }, 500);
    }
}
