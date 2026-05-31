import { apiUrl } from "@/lib/api";

const DEFAULT_MAIN_TEX = `\\documentclass{article}
\\begin{document}
Hello, Glyph!
\\end{document}
`;

export { DEFAULT_MAIN_TEX };

export type JobStatus = {
  status: string;
  logs: string | null;
  pdf_url: string | null;
};

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function ensureProjectAndMainFile(token: string): Promise<{
  projectId: string;
  fileId: string;
}> {
  const projectsRes = await fetch(apiUrl("/projects"), {
    headers: authHeaders(token),
  });
  if (!projectsRes.ok) {
    throw new Error("Could not load projects (are you signed in?)");
  }
  const projects = (await projectsRes.json()) as { id: string }[];
  let projectId: string;
  if (projects.length === 0) {
    const create = await fetch(apiUrl("/projects"), {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ name: "Thesis Main" }),
    });
    if (!create.ok) throw new Error("Could not create project");
    const p = (await create.json()) as { id: string };
    projectId = p.id;
  } else {
    projectId = projects[0].id;
  }

  const filesRes = await fetch(apiUrl(`/projects/${projectId}/files`), {
    headers: authHeaders(token),
  });
  if (!filesRes.ok) throw new Error("Could not load files");
  const files = (await filesRes.json()) as { id: string; path: string; name: string }[];
  const main = files.find(
    (f) => f.path === "main.tex" || f.name === "main.tex"
  );
  if (main) {
    return { projectId, fileId: main.id };
  }

  const created = await fetch(apiUrl(`/projects/${projectId}/files`), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      name: "main.tex",
      path: "main.tex",
      content: DEFAULT_MAIN_TEX,
    }),
  });
  if (!created.ok) {
    const t = await created.text();
    throw new Error(`Could not create main.tex: ${t}`);
  }
  const f = (await created.json()) as { id: string };
  return { projectId, fileId: f.id };
}

export async function startCompile(
  projectId: string,
  token: string
): Promise<string> {
  const res = await fetch(apiUrl(`/projects/${projectId}/compile`), {
    method: "POST",
    headers: authHeaders(token),
  });
  if (res.status === 401) {
    throw new Error("Session expired — sign in again.");
  }
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || "Compile request failed");
  }
  const data = (await res.json()) as { job_id: string };
  return data.job_id;
}

export async function getJob(
  projectId: string,
  jobId: string,
  token: string
): Promise<JobStatus> {
  const res = await fetch(apiUrl(`/projects/${projectId}/jobs/${jobId}`), {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || "Job status failed");
  }
  return res.json();
}

export async function waitForCompile(
  projectId: string,
  jobId: string,
  getTokenFn: () => Promise<string | null>,
  opts?: { intervalMs?: number; maxAttempts?: number }
): Promise<JobStatus> {
  const interval = opts?.intervalMs ?? 400;
  const max = opts?.maxAttempts ?? 300;
  for (let i = 0; i < max; i++) {
    // Refresh token each iteration — Clerk JWTs are short-lived (~60s)
    const freshToken = await getTokenFn();
    if (!freshToken) throw new Error("Session expired — sign in again.");
    const j = await getJob(projectId, jobId, freshToken);
    if (j.status === "success" || j.status === "failed") {
      return j;
    }
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error("Timed out waiting for compilation");
}

export async function fetchJobPdf(
  projectId: string,
  jobId: string,
  token: string
): Promise<Blob> {
  const res = await fetch(apiUrl(`/projects/${projectId}/jobs/${jobId}/pdf`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || "Could not fetch PDF");
  }
  return res.blob();
}
