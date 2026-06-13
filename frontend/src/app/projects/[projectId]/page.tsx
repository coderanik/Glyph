"use client";

import { useEffect, useState, use, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser, useAuth } from "@clerk/nextjs";
import { EditorView } from "codemirror";
import Titlebar from "@/components/Titlebar";
import ActivityBar from "@/components/ActivityBar";
import Sidebar from "@/components/Sidebar";
import PaneHeader from "@/components/PaneHeader";
import Editor from "@/components/Editor";
import PdfViewer from "@/components/PdfViewer";
import ShareModal from "@/components/ShareModal";
import StatusBar from "@/components/StatusBar";
import { apiUrl } from "@/lib/api";
import "./editor.css";
import { ensureProjectAndMainFile, startCompile, waitForCompile, fetchJobPdf } from "@/lib/compile";
import { logError } from "@/lib/errorLogger";

export default function ProjectEditorPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const router = useRouter();
  const { projectId } = use(params);
  const { isLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();

  // Project state
  const [projectName, setProjectName] = useState("Loading...");
  const [fileId, setFileId] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("glyph-theme");
    if (savedTheme === "light" || savedTheme === "dark") {
      const t = setTimeout(() => setTheme(savedTheme), 0);
      return () => clearTimeout(t);
    }
  }, []);
  
  // UI Panels state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState(0); // 0: Files, 1: Outline
  const [activeActivityItem, setActiveActivityItem] = useState(0); // 0: Explorer

  // Compilation state
  const [isCompiling, startCompileTransition] = useTransition();
  const [pdfUrl, setPdfUrlState] = useState<string | null>(null);
  const pdfBlobUrlRef = useRef<string | null>(null);

  const setPdfUrl = (url: string | null) => {
    if (pdfBlobUrlRef.current) {
      window.URL.revokeObjectURL(pdfBlobUrlRef.current);
      pdfBlobUrlRef.current = null;
    }
    if (url && url.startsWith("blob:")) {
      pdfBlobUrlRef.current = url;
    }
    setPdfUrlState(url);
  };

  // Clean up the blob URL on component unmount
  useEffect(() => {
    return () => {
      if (pdfBlobUrlRef.current) {
        window.URL.revokeObjectURL(pdfBlobUrlRef.current);
      }
    };
  }, []);

  const [compileStatus, setCompileStatus] = useState<string | null>("Not compiled yet");

  // Sync / Connection state
  const [connected, setConnected] = useState(false);
  const [wordCount, setWordCount] = useState(0);

  // Collaborative files, users, and modal control states
  const [projectFiles, setProjectFiles] = useState<{ id: string; name: string; path: string; content?: string }[]>([]);
  const [collaborators, setCollaborators] = useState<{ id: string; name: string; initials: string; color: string; online: boolean; imageUrl: string | null }[]>([]);
  const [userRole, setUserRole] = useState<"write" | "read">("write");
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Auto-save state
  const [autoSaveStatus, setAutoSaveStatus] = useState<"saved" | "saving" | "idle">("idle");
  const lastSavedContent = useRef<string>("");

  const editorViewRef = useRef<EditorView | null>(null);

  const handleInsertText = (text: string) => {
    const view = editorViewRef.current;
    if (view) {
      const { from, to } = view.state.selection.main;
      view.dispatch({
        changes: { from, to, insert: text },
        selection: { anchor: from + text.length },
      });
      view.focus();
    }
  };

  const getEditorContext = () => {
    const view = editorViewRef.current;
    if (view) {
      const fileContent = view.state.doc.toString();
      const { from, to } = view.state.selection.main;
      const selectedText = from !== to ? view.state.sliceDoc(from, to) : "";
      return { fileContent, selectedText };
    }
    return { fileContent: "", selectedText: "" };
  };

  const handleReplaceDocument = (text: string) => {
    const view = editorViewRef.current;
    if (view) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: text },
        selection: { anchor: text.length },
      });
      view.focus();
    }
  };

  // Reset autoSaveStatus on fileId change
  useEffect(() => {
    const t = setTimeout(() => {
      setAutoSaveStatus("idle");
    }, 0);
    lastSavedContent.current = "";
    return () => clearTimeout(t);
  }, [fileId]);



  // Redirect if not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  // Load project details, files, and collaborators
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    let active = true;

    async function loadProjectData() {
      try {
        const token = await getToken();
        if (!token) return;

        // 1. Fetch project name and role
        const projectsRes = await fetch(apiUrl("/projects"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (projectsRes.ok && active) {
          const list = await projectsRes.json();
          const current = list.find((p: { id: string; name: string; role: string }) => p.id === projectId);
          if (current) {
            setProjectName(current.name);
            setUserRole(current.role === "read" ? "read" : "write");
          }
        }

        // 2. Load files list
        const filesRes = await fetch(apiUrl(`/projects/${projectId}/files`), {
          headers: { Authorization: `Bearer ${token}` },
        });
        let list = [];
        if (filesRes.ok) {
          list = await filesRes.json();
        }

        const mainFile = list.find((f: { id: string; name: string; path: string }) => f.path === "main.tex");
        if (!mainFile && active) {
          // If main.tex doesn't exist and we have write permission, ensure it
          const projectsList = await fetch(apiUrl("/projects"), {
            headers: { Authorization: `Bearer ${token}` },
          });
          const pList = await projectsList.json();
          const curr = pList.find((p: { id: string; role: string }) => p.id === projectId);
          if (curr && curr.role !== "read") {
            await ensureProjectAndMainFile(token);
            // Re-fetch files
            const reRes = await fetch(apiUrl(`/projects/${projectId}/files`), {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (reRes.ok) {
              list = await reRes.json();
            }
          }
        }

        if (active) {
          setProjectFiles(list);
          const activeMain = list.find((f: { id: string; name: string; path: string }) => f.path === "main.tex");
          if (activeMain) {
            setFileId(activeMain.id);
          } else if (list.length > 0) {
            setFileId(list[0].id);
          }
        }

        // 3. Load collaborators
        const collabRes = await fetch(apiUrl(`/projects/${projectId}/collaborators`), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (collabRes.ok && active) {
          const collabList = await collabRes.json();
          setCollaborators(collabList);
        }

      } catch (err) {
        logError("Failed to load project details:", err);
        if (active) {
          setProjectName("Error loading project");
        }
      }
    }

    loadProjectData();

    // Reload collaborators list periodically for updates.
    // Skip when the browser is offline to avoid Clerk token errors.
    let collabFailCount = 0;
    const interval = setInterval(() => {
      async function reloadCollabs() {
        // Don't attempt network requests when the browser is offline
        if (typeof navigator !== "undefined" && !navigator.onLine) return;
        try {
          const token = await getToken();
          if (!token) return;
          const collabRes = await fetch(apiUrl(`/projects/${projectId}/collaborators`), {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (collabRes.ok && active) {
            const collabList = await collabRes.json();
            setCollaborators(collabList);
            collabFailCount = 0; // reset on success
          }
        } catch (err) {
          collabFailCount++;
          // Only log the first failure to avoid spamming the console
          if (collabFailCount <= 1) {
            logError("Failed to reload collaborators list:", err);
          }
        }
      }
      reloadCollabs();
    }, 30000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [projectId, isLoaded, isSignedIn, getToken]);

  const handleCompile = () => {
    if (userRole === "read") return;
    startCompileTransition(async () => {
      setCompileStatus("Starting compilation...");
      try {
        const token = await getToken();
        if (!token) {
          setCompileStatus("Auth expired");
          return;
        }

        const jobId = await startCompile(projectId, token);
        setCompileStatus("Compiling on server...");

        const job = await waitForCompile(projectId, jobId, getToken);
        if (job.status === "success") {
          setCompileStatus("Success");
          const freshToken = await getToken();
          if (!freshToken) {
            setCompileStatus("Auth expired");
            return;
          }
          const pdfBlob = await fetchJobPdf(projectId, jobId, freshToken);
          const blobUrl = window.URL.createObjectURL(pdfBlob);
          setPdfUrl(blobUrl);
        } else {
          setCompileStatus("Failed");
          setPdfUrl(null);
        }
      } catch (err: unknown) {
        logError("Compilation error:", err);
        setCompileStatus(err instanceof Error ? err.message : "Failed");
      }
    });
  };

  const handleDownloadPdf = async () => {
    if (!pdfUrl) {
      alert("Please compile the document first to generate the PDF.");
      return;
    }

    try {
      let blobUrl = pdfUrl;
      if (!pdfUrl.startsWith("blob:")) {
        const token = await getToken();
        if (!token) return;

        const res = await fetch(pdfUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("Failed to retrieve PDF file from server");
        }

        const blob = await res.blob();
        blobUrl = window.URL.createObjectURL(blob);
      }

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${projectName || "document"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      if (!pdfUrl.startsWith("blob:")) {
        window.URL.revokeObjectURL(blobUrl);
      }
    } catch (err: unknown) {
      logError("Download failed:", err);
      alert(err instanceof Error ? err.message : "Failed to download PDF");
    }
  };

  const handleEditorChange = (code: string) => {
    // Cache the updated text in the files list state to prevent content loss on tab switch
    setProjectFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, content: code } : f))
    );

    // Count words in LaTeX code
    const words = code.trim().split(/\s+/).filter((w) => w.length > 0).length;
    setWordCount(words);
  };

  const handleFileCreate = async () => {
    if (userRole === "read") return;
    const filename = prompt("Enter new filename (e.g. references.bib):");
    if (!filename) return;

    if (!filename.trim()) {
      alert("Filename cannot be empty");
      return;
    }

    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch(apiUrl(`/projects/${projectId}/files`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: filename,
          path: filename,
          content: `% New file: ${filename}\n`,
        }),
      });

      if (res.ok) {
        const newFile = await res.json();
        // Update files list
        setProjectFiles((prev) => [...prev, newFile]);
        // Switch to the newly created file
        setFileId(newFile.id);
      } else {
        const text = await res.text();
        alert(text || "Failed to create file");
      }
    } catch (err) {
      logError("Error creating file:", err);
      alert("Failed to create file");
    }
  };

  if (!isLoaded || !isSignedIn || !fileId) {
    return (
      <div className="editor-loading-screen">
        <div className="editor-glow-orb orb-mint" />
        <div className="editor-glow-orb orb-purple" />
        
        <div className="editor-loading-card">
          <div className="editor-loading-logo-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Glyph Logo" className="editor-loading-logo" />
            <div className="editor-loading-spinner" />
          </div>
          <p className="editor-loading-text">Opening workspace...</p>
        </div>
      </div>
    );
  }

  const activeFile = projectFiles.find((f) => f.id === fileId);

  return (
    <div className={`flex flex-col h-screen overflow-hidden text-text-primary select-none editor-workspace ${theme}`}>
      <div className="editor-glow-orb orb-mint" />
      <div className="editor-glow-orb orb-purple" />
      {/* Title / Action bar */}
      <Titlebar
        projectName={projectName}
        fileName={activeFile?.name || "main.tex"}
        isCompiling={isCompiling}
        onCompile={handleCompile}
        canCompile={userRole !== "read"}
        theme={theme}
        onThemeToggle={() => {
          setTheme((t) => {
            const next = t === "light" ? "dark" : "light";
            localStorage.setItem("glyph-theme", next);
            return next;
          });
        }}
        collaborators={collaborators}
        onShareClick={() => setShareModalOpen(true)}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Side Activity Icons */}
        <ActivityBar
          activeItem={activeActivityItem}
          onItemClick={(idx) => {
            setActiveActivityItem(idx);
            setSidebarOpen(true);
          }}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
        />

        {/* Dynamic Sidebar panels */}
        <Sidebar
          isEditor={true}
          isOpen={sidebarOpen}
          activeTab={sidebarTab}
          onTabChange={setSidebarTab}
          activeActivityItem={activeActivityItem}
          projectName={projectName}
          files={projectFiles}
          activeFileId={fileId}
          onFileSelect={setFileId}
          onFileCreate={handleFileCreate}
          collaborators={collaborators}
          readOnly={userRole === "read"}
          onInsertText={handleInsertText}
          onGetEditorContext={getEditorContext}
          onReplaceDocument={handleReplaceDocument}
          projectId={projectId}
        />

        {/* Center Split Screen: Editor and PDF Viewer */}
        <main className="flex-1 flex min-w-0 overflow-hidden">
          {/* CodeMirror LaTeX Editor Pane */}
          <div className="flex-1 flex flex-col border-r border-border-secondary min-w-0">
            <PaneHeader title="LaTeX Source" type="editor" />
            <div className="flex-1 min-h-0 relative">
              {fileId && (
                <Editor
                  fileId={fileId}
                  initialContent={activeFile?.content || ""}
                  onChange={handleEditorChange}
                  readOnly={userRole === "read"}
                  editorViewRef={editorViewRef}
                  onConnectionStatusChange={setConnected}
                />
              )}
            </div>
          </div>

          {/* Compiled PDF / HTML Preview Pane */}
          <div className="flex-1 flex flex-col min-w-0">
            <PaneHeader
              title="Preview"
              type="preview"
              compileStatus={compileStatus || ""}
              onDownload={handleDownloadPdf}
            />
            <PdfViewer
              isCompiling={isCompiling}
              pdfUrl={pdfUrl}
              statusMessage={compileStatus === "Failed" ? "Compilation failed. Click for logs." : null}
            />
          </div>
        </main>
      </div>

      {/* Footer Status Bar */}
      <StatusBar
        connected={connected}
        onlineCount={collaborators.filter(c => c.online).length}
        wordCount={wordCount}
        hasErrors={compileStatus === "Failed"}
        errorCount={compileStatus === "Failed" ? 1 : 0}
        autoSaveStatus={autoSaveStatus}
      />

      {/* Share Modal Dialog */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        projectId={projectId}
        getToken={getToken}
      />
    </div>
  );
}
