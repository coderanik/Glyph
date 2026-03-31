"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import SidebarNew from '@/components/SidebarNew';
import ActivityBar from '@/components/ActivityBar';
import Titlebar from '@/components/Titlebar';
import EditorTabs from '@/components/EditorTabs';
import PaneHeader from '@/components/PaneHeader';
import StatusBar from '@/components/StatusBar';
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

const tabs = [
  { name: "main.tex", active: true, hasUnsavedChanges: true },
  { name: "references.bib", active: false, hasUnsavedChanges: false },
];

export default function Home() {
  const [isCompiling, setIsCompiling] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [bootMessage, setBootMessage] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState(0);
  const [activityItem, setActivityItem] = useState(0);
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

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* Titlebar */}
      <Titlebar
        projectName="thesis-draft"
        fileName="main.tex"
        isCompiling={isCompiling}
        onCompile={runCompile}
        canCompile={!!projectId}
      />

      {/* Main body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Activity Bar */}
        <ActivityBar
          activeItem={activityItem}
          onItemClick={setActivityItem}
          onToggleSidebar={handleToggleSidebar}
          sidebarOpen={sidebarOpen}
        />

        {/* Sidebar */}
        <SidebarNew
          isOpen={sidebarOpen}
          activeTab={sidebarTab}
          onTabChange={setSidebarTab}
        />

        {/* Editor Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <EditorTabs
            tabs={tabs}
            onTabClick={(idx) => console.log("Tab click", idx)}
          />

          {/* Split pane */}
          <div className="flex flex-1 overflow-hidden">
            {/* Editor pane */}
            <div className="w-1/2 flex flex-col border-r border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <PaneHeader title="Editor" subtitle="Ln 14, Col 22" type="editor" />
              <div className="flex-1 relative overflow-hidden">
                {fileId ? (
                  <Editor fileId={fileId} onChange={handleEditorChange} />
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-zinc-500 p-4 text-center">
                    {bootMessage ?? "Loading editor…"}
                  </div>
                )}
              </div>
            </div>

            {/* Preview pane */}
            <div className="w-1/2 flex flex-col overflow-hidden bg-zinc-50 dark:bg-[#1A1A1A]">
              <PaneHeader
                title="Preview"
                type="preview"
                compileStatus={isCompiling ? "Compiling…" : pdfUrl ? "Compiled" : undefined}
              />
              <PdfViewer
                isCompiling={isCompiling}
                pdfUrl={pdfUrl}
                statusMessage={bootMessage}
              />
            </div>
          </div>

          {/* Status bar */}
          <StatusBar
            connected={true}
            onlineCount={2}
            wordCount={4812}
            hasErrors={false}
            errorCount={0}
          />
        </div>
      </div>
    </div>
  );
}