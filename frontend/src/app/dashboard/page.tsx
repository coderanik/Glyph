"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useUser, UserButton, useAuth } from "@clerk/nextjs";
import { apiUrl } from "@/lib/api";
import "./dashboard.css";
import { logError } from "@/lib/errorLogger";

/* ── Icon components (inline SVGs to avoid icon library deps) ── */

function IconPlus({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}

function IconGrid({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="5" height="5" rx="1" />
      <rect x="10" y="3" width="5" height="5" rx="1" />
      <rect x="3" y="10" width="5" height="5" rx="1" />
      <rect x="10" y="10" width="5" height="5" rx="1" />
    </svg>
  );
}

function IconUser({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="6" r="3" />
      <path d="M3 16c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    </svg>
  );
}

function IconUsers({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="6" r="2.5" />
      <path d="M2 16c0-2.8 2.2-5 5-5s5 2.2 5 5" />
      <circle cx="13" cy="5.5" r="2" />
      <path d="M13 11c2.2.4 4 2.2 4 4.5" />
    </svg>
  );
}

function IconArchive({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="14" height="4" rx="1" />
      <path d="M3 7v7a1 1 0 001 1h10a1 1 0 001-1V7" />
      <path d="M7 10h4" />
    </svg>
  );
}

function IconTrash({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 5h12M6 5V4a1 1 0 011-1h4a1 1 0 011 1v1" />
      <path d="M5 5l1 10a1 1 0 001 1h4a1 1 0 001-1l1-10" />
    </svg>
  );
}

function IconTag({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5V4a1 1 0 011-1h5.5L15 8.5 9.5 14 3 9.5z" />
      <circle cx="6.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  );
}

function IconSearch({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5L14 14" />
    </svg>
  );
}

function IconFile({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2h5l4 4v8a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" />
      <path d="M9 2v4h4" />
      <path d="M5 9h6M5 11.5h4" />
    </svg>
  );
}

function IconCopy({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="5" width="8" height="8" rx="1" />
      <path d="M11 3H4a1 1 0 00-1 1v7" />
    </svg>
  );
}

function IconDownload({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v9M4.5 8L8 11.5 11.5 8" />
      <path d="M3 13h10" />
    </svg>
  );
}

function IconShare({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="4" r="2" />
      <circle cx="4" cy="8" r="2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M6 9l4 2M6 7l4-2" />
    </svg>
  );
}

function IconSettings({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M2.9 2.9l1.4 1.4M11.7 11.7l1.4 1.4M2.9 13.1l1.4-1.4M11.7 4.3l1.4-1.4" />
    </svg>
  );
}



function IconTrashSmall({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 5h10M5.5 5V4a1 1 0 011-1h3a1 1 0 011 1v1" />
      <path d="M4.5 5l.7 8a1 1 0 001 1h3.6a1 1 0 001-1l.7-8" />
    </svg>
  );
}

function IconX({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4L4 12M4 4l8 8" />
    </svg>
  );
}

function IconAcademic({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2L1 5.5 8 9l7-3.5L8 2z" />
      <path d="M3 7.5v4c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2v-4" />
      <path d="M12 9v3" />
    </svg>
  );
}

function IconBriefcase({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="12" height="9" rx="1.5" />
      <path d="M5 5V3a1 1 0 011-1h4a1 1 0 011 1v2" />
      <path d="M2 8h12" />
    </svg>
  );
}


/* ── Nav items ── */
const NAV_ITEMS = [
  { icon: IconGrid, label: "All projects", id: "all" },
  { icon: IconUser, label: "Your projects", id: "yours" },
  { icon: IconUsers, label: "Shared with you", id: "shared" },
  { icon: IconArchive, label: "Archived", id: "archived" },
  { icon: IconTrash, label: "Trash", id: "trash" },
];

const TAG_ITEMS = [
  { label: "Research" },
  { label: "Coursework" },
];

/* ── Component ── */
export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  
  const theme = "dark";
  const [activeNav, setActiveNav] = useState("all");
  const [search, setSearch] = useState("");
  const [selectAll, setSelectAll] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  type ProjectData = {
    id: string;
    name: string;
    role: string;
    ownerName?: string;
    ownerFirstName?: string;
    createdAt: string;
  };
  const [projectsList, setProjectsList] = useState<ProjectData[]>([]);
  const [isProjectsLoading, setIsProjectsLoading] = useState(true);

  // New Project Flow States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectType, setProjectType] = useState("empty");
  const [projectName, setProjectName] = useState("Untitled Project");
  const [isCreating, setIsCreating] = useState(false);

  // Default theme is locked to dark mode

  // Fetch real projects from DB
  const loadProjectsFromDb = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch(apiUrl("/projects"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        setProjectsList(data);
      }
    } catch (err) {
      logError("Failed to load projects:", err);
    } finally {
      setIsProjectsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (isLoaded && user) {
      const t = setTimeout(() => loadProjectsFromDb(), 0);
      return () => clearTimeout(t);
    }
  }, [isLoaded, user, loadProjectsFromDb]);

  const filteredProjects = useMemo(() => {
    let list = projectsList;
    if (activeNav === "yours") {
      list = projectsList.filter((p) => p.role === "owner");
    } else if (activeNav === "shared") {
      list = projectsList.filter((p) => p.role !== "owner");
    } else if (activeNav === "archived") {
      list = [];
    } else if (activeNav === "trash") {
      list = [];
    }

    const q = search.toLowerCase();
    return list.filter((p) => p.name.toLowerCase().includes(q));
  }, [search, projectsList, activeNav]);



  const handleSelectAll = () => {
    if (selectAll) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredProjects.map((p) => p.id)));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectRow = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelected(next);
    setSelectAll(next.size === filteredProjects.length);
  };

  // Create Project handler
  const handleCreateProject = async () => {
    if (!projectName.trim()) return;
    setIsCreating(true);

    try {
      const token = await getToken();
      if (!token) return;

      // 1. Create project metadata
      const res = await fetch(apiUrl("/projects"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: projectName }),
      });

      if (!res.ok) throw new Error("Could not create project");
      const project = await res.json();

      // 2. Write initial default main.tex file (needed by compiler)
      const defaultContent = `\\documentclass{article}
\\begin{document}
\\title{${projectName}}
\\author{${user?.fullName || "Author"}}
\\date{\\today}
\\maketitle

\\section{Introduction}
Start writing your LaTeX document here...

\\end{document}
`;

      await fetch(apiUrl(`/projects/${project.id}/files`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: "main.tex",
          path: "main.tex",
          content: defaultContent,
        }),
      });

      // 3. Redirect to the editor page
      router.push(`/projects/${project.id}`);
    } catch (err) {
      logError("Failed to create project:", err);
      alert("Failed to create project. Please try again.");
    } finally {
      setIsCreating(false);
      setIsModalOpen(false);
    }
  };

  const userInitials = isLoaded && user
    ? (user.firstName?.[0] ?? "").toUpperCase() + (user.lastName?.[0] ?? "").toUpperCase() || "U"
    : "U";

  return (
    <div className={`dashboard ${theme}`}>
      <div className="dash-glow-orb orb-mint" />
      <div className="dash-glow-orb orb-purple" />
      {/* ── Sidebar ── */}
      <aside className="dash-sidebar">
        <div className="dash-sidebar-top">
          <div className="dash-logo">
            <div className="dash-logo-mark">
              <Image
                src="/logo.png"
                alt="Glyph Logo"
                width={38}
                height={38}
                className="rounded-[6px] object-cover"
              />
            </div>
            <span>Glyph</span>
          </div>
          <button 
            className="dash-btn-new"
            onClick={() => {
              setProjectName("Untitled LaTeX Project");
              setProjectType("empty");
              setIsModalOpen(true);
            }}
          >
            <IconPlus size={14} />
            <span>New project</span>
          </button>
        </div>

        <div className="dash-nav-section">
          {NAV_ITEMS.map((item) => (
            <div
              key={item.id}
              className={`dash-nav-item ${activeNav === item.id ? "active" : ""}`}
              onClick={() => setActiveNav(item.id)}
            >
              <item.icon size={17} />
              {item.label}
            </div>
          ))}
        </div>

        <div className="dash-nav-section">
          <div className="dash-nav-label">Tags</div>
          {TAG_ITEMS.map((tag) => (
            <div key={tag.label} className="dash-nav-item">
              <IconTag size={17} />
              {tag.label}
            </div>
          ))}
          <div className="dash-nav-item dash-nav-item-muted">
            <IconPlus size={17} />
            New tag
          </div>
        </div>

        <div className="dash-sidebar-footer">
          <div className="flex items-center justify-between text-[10px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
            <span>Version</span>
            <span>v0.1.0</span>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="dash-main">
        <div className="dash-topbar">
          <div className="dash-topbar-left">
            <span className="dash-topbar-title">
              {activeNav === "all" && "All projects"}
              {activeNav === "yours" && "Your projects"}
              {activeNav === "shared" && "Shared with you"}
              {activeNav === "archived" && "Archived"}
              {activeNav === "trash" && "Trash"}
            </span>
          </div>
          <div className="dash-topbar-right">
            <div className="dash-search-wrap">
              <IconSearch size={15} />
              <input
                className="dash-search-input"
                type="text"
                placeholder="Search projects…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Link href="/settings" style={{ display: "flex" }}>
              <button className="dash-icon-btn" aria-label="Settings" title="Settings">
                <IconSettings size={16} />
              </button>
            </Link>
            <div style={{ display: "flex", alignItems: "center" }}>
              {isLoaded && user ? (
                <UserButton />
              ) : (
                <div className="dash-avatar">{userInitials}</div>
              )}
            </div>
          </div>
        </div>

        <div className="dash-content">
          <div className="dash-table-wrap">
            {isProjectsLoading ? (
              <div className="dash-loading-state">
                <div className="dash-loading-spinner" />
                <p className="text-xs font-mono tracking-wider uppercase text-[var(--color-text-secondary)]">Retrieving documents...</p>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="dash-empty-state">
                <div className="dash-empty-icon-wrap">
                  <IconFile size={22} />
                </div>
                <p className="dash-empty-title">
                  {activeNav === "archived"
                    ? "No Archived Projects"
                    : activeNav === "trash"
                    ? "Trash is Empty"
                    : "No Projects Found"}
                </p>
                <p className="dash-empty-desc">
                  {activeNav === "archived"
                    ? "Archived documents will appear here."
                    : activeNav === "trash"
                    ? "Trash items are cleaned up automatically."
                    : "Create a new project to get started."}
                </p>
                {activeNav !== "archived" && activeNav !== "trash" && (
                  <button
                    className="dash-empty-btn"
                    onClick={() => {
                      setProjectName("Untitled LaTeX Project");
                      setProjectType("empty");
                      setIsModalOpen(true);
                    }}
                  >
                    Create your first project
                  </button>
                )}
              </div>
            ) : (
              <table className="dash-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                        aria-label="Select all"
                      />
                    </th>
                    <th>Title</th>
                    <th>Owner</th>
                    <th>Date Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.map((project) => (
                    <tr 
                      key={project.id} 
                      className={selected.has(project.id) ? "selected" : ""}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.has(project.id)}
                          onChange={() => handleSelectRow(project.id)}
                          aria-label={`Select ${project.name}`}
                        />
                      </td>
                      <td>
                        <Link href={`/projects/${project.id}`}>
                          <div className="dash-td-title cursor-pointer hover:opacity-85 transition-opacity">
                            <div className="dash-file-icon">
                              <IconFile size={15} />
                            </div>
                            <div>
                              <div className="dash-td-name font-medium">{project.name}</div>
                              <div className="dash-td-meta">
                                main.tex
                              </div>
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td>
                        {project.role === "owner" ? (
                          <span className="dash-badge dash-badge-you">
                            You
                          </span>
                        ) : (
                          <div className="flex flex-col text-left">
                            <span className="text-[12px] font-medium text-text-primary leading-normal">
                              {project.ownerName || "Collaborator"}
                            </span>
                            <span className="text-[10px] text-text-tertiary font-normal leading-normal">
                              Shared by {project.ownerFirstName || "owner"}
                            </span>
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="dash-status-pill">
                          <div className="dash-dot-green" />
                          {new Date(project.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td>
                        <div className="dash-td-actions">
                          <button className="dash-icon-btn" aria-label="Copy">
                            <IconCopy size={15} />
                          </button>
                          <button className="dash-icon-btn" aria-label="Download">
                            <IconDownload size={15} />
                          </button>
                          <button className="dash-icon-btn" aria-label="Share">
                            <IconShare size={15} />
                          </button>
                          <button className="dash-icon-btn" aria-label="Delete">
                            <IconTrashSmall size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!isProjectsLoading && (
              <div className="dash-footer-count">
                {search
                  ? `Showing ${filteredProjects.length} of ${projectsList.length} projects`
                  : `Showing ${projectsList.length} of ${projectsList.length} projects`}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── New Project Modal ── */}
      {isModalOpen && (
        <div className="dash-modal-overlay" onClick={() => !isCreating && setIsModalOpen(false)}>
          <div className="dash-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dash-modal-header">
              <div>
                <h3 className="dash-modal-title">Create New Project</h3>
                <p className="dash-modal-desc">Start composing a new LaTeX document.</p>
              </div>
              <button 
                className="dash-modal-close" 
                onClick={() => setIsModalOpen(false)}
                disabled={isCreating}
                aria-label="Close modal"
              >
                <IconX size={16} />
              </button>
            </div>

            {/* Step 1: Select Template */}
            <div className="dash-modal-field">
              <label className="dash-modal-label">Project Template</label>
              <div className="dash-modal-templates">
                <div 
                  className={`dash-template-card ${projectType === "empty" ? "active" : ""}`}
                  onClick={() => setProjectType("empty")}
                >
                  <div className="dash-template-icon">
                    <IconPlus size={18} />
                  </div>
                  <div className="dash-template-info">
                    <div className="dash-template-title">Empty Project</div>
                    <div className="dash-template-desc">A clean slate with basic LaTeX configuration.</div>
                  </div>
                </div>

                <div className="dash-template-card disabled">
                  <div className="dash-template-icon">
                    <IconAcademic size={18} />
                  </div>
                  <div className="dash-template-info">
                    <div className="dash-template-title">Academic Thesis</div>
                    <div className="dash-template-desc">Multi-file document for research papers.</div>
                  </div>
                  <span className="dash-template-badge">Soon</span>
                </div>

                <div className="dash-template-card disabled">
                  <div className="dash-template-icon">
                    <IconBriefcase size={18} />
                  </div>
                  <div className="dash-template-info">
                    <div className="dash-template-title">Resume / CV</div>
                    <div className="dash-template-desc">Professional single-page curriculum vitae.</div>
                  </div>
                  <span className="dash-template-badge">Soon</span>
                </div>
              </div>
            </div>

            {/* Step 2: Name */}
            {projectType === "empty" && (
              <div className="dash-modal-field">
                <label className="dash-modal-label">Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter project name..."
                  className="dash-modal-input"
                  autoFocus
                />
              </div>
            )}

            {/* Actions */}
            <div className="dash-modal-actions">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isCreating}
                className="dash-modal-btn dash-modal-btn-cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateProject}
                disabled={isCreating || !projectName.trim()}
                className="dash-modal-btn dash-modal-btn-create"
              >
                {isCreating ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Creating...</span>
                  </div>
                ) : (
                  <span>Create Project</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}