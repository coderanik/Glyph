"use client";

import { useEffect, useState, use, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser, useAuth } from "@clerk/nextjs";
import Titlebar from "@/components/Titlebar";
import ActivityBar from "@/components/ActivityBar";
import SidebarNew from "@/components/SidebarNew";
import PaneHeader from "@/components/PaneHeader";
import Editor from "@/components/Editor";
import PdfViewer from "@/components/PdfViewer";
import ShareModal from "@/components/ShareModal";
import StatusBar from "@/components/StatusBar";
import { apiUrl } from "@/lib/api";
import { ensureProjectAndMainFile, startCompile, waitForCompile } from "@/lib/compile";

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
      setTheme(savedTheme);
    }
  }, []);
  
  // UI Panels state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState(0); // 0: Files, 1: Outline
  const [activeActivityItem, setActiveActivityItem] = useState(0); // 0: Explorer

  // Compilation state
  const [isCompiling, startCompileTransition] = useTransition();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [compileStatus, setCompileStatus] = useState<string | null>("Not compiled yet");

  // Sync / Connection state
  const [connected, setConnected] = useState(true);
  const [wordCount, setWordCount] = useState(0);

  // Editor code content & preview mode
  const [editorCode, setEditorCode] = useState<string>("");

  // Collaborative files, users, and modal control states
  const [projectFiles, setProjectFiles] = useState<{ id: string; name: string; path: string }[]>([]);
  const [collaborators, setCollaborators] = useState<{ id: string; name: string; initials: string; color: string; online: boolean }[]>([]);
  const [userRole, setUserRole] = useState<"write" | "read">("write");
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Auto-save state
  const [autoSaveStatus, setAutoSaveStatus] = useState<"saved" | "saving" | "idle">("idle");
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContent = useRef<string>("");

  // Reset editorCode on fileId change to prevent content flash from previous file
  useEffect(() => {
    setEditorCode("");
    lastSavedContent.current = "";
    setAutoSaveStatus("idle");
  }, [fileId]);

  // Debounced auto-save: saves 2.5s after user stops typing
  useEffect(() => {
    // Don't auto-save if read-only, no file selected, or content is empty/unchanged
    if (userRole === "read" || !fileId || !editorCode) return;
    if (editorCode === lastSavedContent.current) return;

    // Clear any pending save timer
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }

    autoSaveTimer.current = setTimeout(async () => {
      try {
        const token = await getToken();
        if (!token) return;

        const activeFile = projectFiles.find((f) => f.id === fileId);
        if (!activeFile) return;

        setAutoSaveStatus("saving");

        const res = await fetch(apiUrl(`/projects/${projectId}/files`), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: activeFile.name,
            path: activeFile.path,
            content: editorCode,
          }),
        });

        if (res.ok) {
          lastSavedContent.current = editorCode;
          setAutoSaveStatus("saved");
        }
      } catch (err) {
        console.error("Auto-save failed:", err);
      }
    }, 2500);

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [editorCode, fileId, userRole, getToken, projectId, projectFiles]);

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
          const current = list.find((p: any) => p.id === projectId);
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

        const mainFile = list.find((f: any) => f.path === "main.tex");
        if (!mainFile && active) {
          // If main.tex doesn't exist and we have write permission, ensure it
          const projectsList = await fetch(apiUrl("/projects"), {
            headers: { Authorization: `Bearer ${token}` },
          });
          const pList = await projectsList.json();
          const curr = pList.find((p: any) => p.id === projectId);
          if (curr && curr.role !== "read") {
            const { fileId: resolvedFileId } = await ensureProjectAndMainFile(token);
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
          const activeMain = list.find((f: any) => f.path === "main.tex");
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
        console.error("Failed to load project details:", err);
        if (active) {
          setProjectName("Error loading project");
        }
      }
    }

    loadProjectData();

    // Reload collaborators list periodically (every 10 seconds) for updates
    const interval = setInterval(() => {
      async function reloadCollabs() {
        try {
          const token = await getToken();
          if (!token) return;
          const collabRes = await fetch(apiUrl(`/projects/${projectId}/collaborators`), {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (collabRes.ok && active) {
            const collabList = await collabRes.json();
            setCollaborators(collabList);
          }
        } catch (e) {}
      }
      reloadCollabs();
    }, 10000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [projectId, isLoaded, isSignedIn, getToken]);

  const handleCompile = () => {
    if (userRole === "read") return;
    startCompileTransition(async () => {
      setCompileStatus("Saving document...");
      try {
        const token = await getToken();
        if (!token) {
          setCompileStatus("Auth expired");
          return;
        }

        // Find active file path/name
        const activeFile = projectFiles.find((f) => f.id === fileId);
        const name = activeFile?.name || "main.tex";
        const path = activeFile?.path || "main.tex";

        // Save current editor code to database prior to compilation
        const saveRes = await fetch(apiUrl(`/projects/${projectId}/files`), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name,
            path,
            content: editorCode,
          }),
        });

        if (!saveRes.ok) {
          throw new Error("Failed to save draft to server");
        }

        setCompileStatus("Starting compilation...");
        const jobId = await startCompile(projectId, token);
        setCompileStatus("Compiling on server...");

        const job = await waitForCompile(projectId, jobId, token);
        if (job.status === "success") {
          setCompileStatus("Success");
          // Use absolute API URL to load PDF in iframe
          setPdfUrl(apiUrl(job.pdf_url || ""));
        } else {
          setCompileStatus("Failed");
          setPdfUrl(null);
        }
      } catch (err: any) {
        console.error("Compilation error:", err);
        setCompileStatus(err.message || "Failed");
      }
    });
  };

  const handleDownloadPdf = async () => {
    if (!pdfUrl) {
      alert("Please compile the document first to generate the PDF.");
      return;
    }

    try {
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
      const blobUrl = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${projectName || "document"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      window.URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      console.error("Download failed:", err);
      alert(err.message || "Failed to download PDF");
    }
  };

  const handleEditorChange = (code: string) => {
    setEditorCode(code);
    
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
      console.error("Error creating file:", err);
      alert("Failed to create file");
    }
  };

  if (!isLoaded || !isSignedIn || !fileId) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-tertiary text-text-primary">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-text-secondary">Opening editor workspace...</p>
        </div>
      </div>
    );
  }

  const activeFile = projectFiles.find((f) => f.id === fileId);

  return (
    <div className={`flex flex-col h-screen overflow-hidden bg-bg-primary text-text-primary select-none ${theme}`}>
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
        <SidebarNew
          isOpen={sidebarOpen}
          activeTab={sidebarTab}
          onTabChange={setSidebarTab}
          projectName={projectName}
          files={projectFiles}
          activeFileId={fileId}
          onFileSelect={setFileId}
          onFileCreate={handleFileCreate}
          collaborators={collaborators}
          readOnly={userRole === "read"}
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
                  onChange={handleEditorChange}
                  readOnly={userRole === "read"}
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
