"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/Sidebar';
import PdfViewer from '@/components/PdfViewer';
import UserDropdown from '@/components/UserDropdown';
import {
  ensureProjectAndMainFile,
  fetchJobPdf,
  startCompile,
  waitForCompile,
} from '@/lib/compile';

const Editor = dynamic(() => import('@/components/Editor'), {
  ssr: false,
});

export default function Home() {
  const [isCompiling, setIsCompiling] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [bootMessage, setBootMessage] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const pdfObjectUrl = useRef<string | null>(null);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("glyph_token") : null;
    if (!token) {
      setBootMessage("Sign in to sync projects and compile.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { projectId: pid, fileId: fid } = await ensureProjectAndMainFile(token);
        if (!cancelled) {
          setProjectId(pid);
          setFileId(fid);
          setBootMessage(null);
        }
      } catch (e) {
        if (!cancelled) {
          setBootMessage(e instanceof Error ? e.message : "Could not load project.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (pdfObjectUrl.current) {
        URL.revokeObjectURL(pdfObjectUrl.current);
      }
    };
  }, []);

  const runCompile = useCallback(async () => {
    const token = localStorage.getItem("glyph_token");
    if (!token || !projectId) {
      setBootMessage("Sign in and wait for the project to load before compiling.");
      return;
    }
    if (pdfObjectUrl.current) {
      URL.revokeObjectURL(pdfObjectUrl.current);
      pdfObjectUrl.current = null;
    }
    setPdfUrl(null);
    setIsCompiling(true);
    try {
      const jobId = await startCompile(projectId, token);
      const result = await waitForCompile(projectId, jobId, token);
      if (result.status === "failed") {
        setBootMessage(result.logs ?? "Compilation failed — check logs.");
        return;
      }
      const blob = await fetchJobPdf(projectId, jobId, token);
      const url = URL.createObjectURL(blob);
      pdfObjectUrl.current = url;
      setPdfUrl(url);
      setBootMessage(null);
    } catch (e) {
      setBootMessage(e instanceof Error ? e.message : "Compile failed.");
    } finally {
      setIsCompiling(false);
    }
  }, [projectId]);

  const handleEditorChange = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      runCompile();
    }, 1200);
  }, [runCompile]);

  return (
    <div className="flex bg-white dark:bg-zinc-950 h-screen overflow-hidden text-zinc-900 dark:text-zinc-100">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-12 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-4 shrink-0 transition-colors">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-medium tracking-tight">
              Thesis Main
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={runCompile}
              className={`px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors shadow-sm ${isCompiling || !projectId ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={isCompiling || !projectId}
            >
              Compile
            </button>
            <UserDropdown />
          </div>
        </header>

        <div className="flex-1 overflow-hidden flex flex-row">

          <div className="w-1/2 h-full bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex flex-col">
            <div className="flex-1 relative">
              {fileId ? (
                <Editor fileId={fileId} onChange={handleEditorChange} />
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-zinc-500 p-4 text-center">
                  {bootMessage ?? "Loading editor…"}
                </div>
              )}
            </div>
          </div>

          <div className="w-1/2 h-full bg-zinc-50 dark:bg-[#1A1A1A] flex flex-col relative">
            <PdfViewer
              isCompiling={isCompiling}
              pdfUrl={pdfUrl}
              statusMessage={bootMessage}
            />
          </div>

        </div>
      </main>
    </div>
  );
}
