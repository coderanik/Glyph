import './config/env.js';
import { query } from './config/db.js';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const WORKSPACES_DIR = path.resolve('/tmp/workspaces');

interface ProjectFile {
  path: string;
  content: string;
}

function isSafeFilePath(filePath: string): boolean {
  if (!filePath) return false;
  const normalized = path.posix.normalize(filePath);
  if (path.posix.isAbsolute(normalized) || normalized.startsWith('..') || normalized.includes('..')) {
    return false;
  }
  return true;
}

export async function compileJob(jobId: string, projectId: string) {
  console.log(`[Worker] Starting compilation for job ${jobId}, project ${projectId}`);
  const workspaceDir = path.join(WORKSPACES_DIR, jobId);
  await fs.mkdir(workspaceDir, { recursive: true });

  try {
    // Fetch files from the DB
    const filesRes = await query('SELECT path, content FROM files WHERE project_id = $1', [projectId]);
    const files = filesRes.rows as ProjectFile[];
    const mainFile = files.find((f) => f.path === 'main.tex');

    if (!mainFile) {
      throw new Error("main.tex not found in project. A 'main.tex' file is required for compilation.");
    }

    // Write all project files to workspace
    for (const f of files) {
      if (!isSafeFilePath(f.path)) {
        throw new Error(`Insecure file path traversal detected: ${f.path}`);
      }
      const fullPath = path.join(workspaceDir, f.path);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, f.content || '');
    }

    // Check if latexmk is installed locally on the host/container
    let useDocker = false;
    try {
      await execAsync('which latexmk');
    } catch (err) {
      useDocker = true;
    }

    let cmd = `latexmk -pdf -interaction=nonstopmode main.tex`;
    if (useDocker) {
      let canonicalWorkspaceDir = workspaceDir;
      try {
        canonicalWorkspaceDir = await fs.realpath(workspaceDir);
      } catch (err) {
        console.error(`[Worker] Failed to resolve canonical path for ${workspaceDir}:`, err);
      }
      console.log(`[Worker] 'latexmk' not found locally. Compiling inside Docker container 'glyph-compiler'...`);
      cmd = `docker run --rm -v "${canonicalWorkspaceDir}":/workspace glyph-compiler /usr/local/bin/worker.sh main.tex`;
    } else {
      console.log(`[Worker] 'latexmk' found in path. Compiling directly...`);
    }

    let logs = '';
    let status = 'success';

    try {
      const { stdout, stderr } = await execAsync(cmd, { cwd: workspaceDir });
      logs = stdout + '\n' + stderr;
    } catch (execErr) {
      const errObj = execErr as { stdout?: string; stderr?: string; message?: string };
      logs = (errObj.stdout || '') + '\n' + (errObj.stderr || '') + '\n' + (errObj.message || '');
      status = 'failed';
    }

    if (status === 'success') {
      const compiledPdf = path.join(workspaceDir, 'main.pdf');
      if (existsSync(compiledPdf)) {
        const pdfBytes = await fs.readFile(compiledPdf);
        await query(
          `UPDATE compilation_jobs 
           SET status = $1, logs = $2, pdf_data = $3, pdf_url = $4, completed_at = CURRENT_TIMESTAMP 
           WHERE id = $5`,
          ['success', logs, pdfBytes, `/projects/${projectId}/jobs/${jobId}/pdf`, jobId]
        );
        console.log(`[Worker] Job ${jobId} compiled successfully!`);
      } else {
        await query(
          `UPDATE compilation_jobs 
           SET status = $1, logs = $2, completed_at = CURRENT_TIMESTAMP 
           WHERE id = $3`,
          ['failed', logs + '\nError: main.pdf was not produced by latexmk.', jobId]
        );
        console.log(`[Worker] Job ${jobId} failed: main.pdf not found`);
      }
    } else {
      await query(
        `UPDATE compilation_jobs 
         SET status = $1, logs = $2, completed_at = CURRENT_TIMESTAMP 
         WHERE id = $3`,
        ['failed', logs, jobId]
      );
      console.log(`[Worker] Job ${jobId} failed to compile.`);
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[Worker] Error compiling job ${jobId}:`, err);
    try {
      await query(
        `UPDATE compilation_jobs 
         SET status = $1, logs = $2, completed_at = CURRENT_TIMESTAMP 
         WHERE id = $3`,
        ['failed', `System Error: ${errorMessage}`, jobId]
      );
    } catch (dbErr) {
      console.error(`[Worker] Fatal db error updating job ${jobId}:`, dbErr);
    }
  } finally {
    // Clean up workspace
    try {
      await fs.rm(workspaceDir, { recursive: true, force: true });
    } catch (cleanupErr) {
      console.error(`[Worker] Failed to clean up workspace ${workspaceDir}:`, cleanupErr);
    }
  }
}

export async function pollQueue() {
  try {
    // Claim the job using UPDATE with SELECT FOR UPDATE SKIP LOCKED
    const result = await query(`
      UPDATE compilation_jobs
      SET status = 'running', logs = 'Compiling LaTeX files...\n'
      WHERE id = (
        SELECT id
        FROM compilation_jobs
        WHERE status = 'queued'
        ORDER BY started_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id, project_id AS "projectId"
    `);

    if (result.rows.length > 0) {
      const job = result.rows[0];
      await compileJob(job.id, job.projectId);
      return true; // Found and processed a job
    }
  } catch (err) {
    console.error('[Worker] Error polling queue:', err);
  }
  return false; // No job found or error
}

async function startWorker() {
  console.log('🤖 Compile worker sidecar started, testing database connection...');
  
  // Verify database connectivity on startup
  try {
    await query('SELECT 1');
    console.log('✅ Compile worker successfully connected to PostgreSQL.');
  } catch (dbErr) {
    console.error('Fatal: Compile worker failed to connect to database:', dbErr);
    process.exit(1);
  }

  // Ensure workspace parent directory exists
  await fs.mkdir(WORKSPACES_DIR, { recursive: true }).catch(() => {});

  while (true) {
    const processed = await pollQueue();
    if (!processed) {
      // Sleep 1s if no job was found
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

if (process.env.NODE_ENV !== 'test') {
  startWorker();
}
