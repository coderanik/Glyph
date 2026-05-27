"use client";

import { useState } from "react";
import {
  FileText,
  Folder,
  ChevronRight,
  ChevronDown,
  Plus,
} from "lucide-react";

type SidebarNewProps = {
  isOpen: boolean;
  activeTab: number;
  onTabChange: (tab: number) => void;
  // Project files logic
  projectName: string;
  files: { id: string; name: string; path: string }[];
  activeFileId: string | null;
  onFileSelect: (fileId: string) => void;
  onFileCreate?: () => void;
  // Collaborators logic
  collaborators?: { id: string; name: string; initials: string; color: string; online: boolean }[];
  readOnly?: boolean;
};

const outline = [
  { name: "1. Introduction", indent: 0 },
  { name: "1.1 Background", indent: 1 },
  { name: "1.2 Motivation", indent: 1 },
  { name: "2. Methodology", indent: 0 },
  { name: "3. Results", indent: 0 },
  { name: "4. Conclusion", indent: 0 },
];

export default function SidebarNew({
  isOpen,
  activeTab,
  onTabChange,
  projectName,
  files = [],
  activeFileId,
  onFileSelect,
  onFileCreate,
  collaborators = [],
  readOnly = false,
}: SidebarNewProps) {
  const [foldersExpanded, setFoldersExpanded] = useState(true);

  if (!isOpen) return null;

  return (
    <aside className="w-[200px] shrink-0 bg-bg-secondary border-r border-border-secondary flex flex-col overflow-hidden transition-all duration-200 text-text-primary select-none">
      {/* Tabs */}
      <div className="flex border-b border-border-secondary shrink-0">
        <button
          onClick={() => onTabChange(0)}
          className={`flex-1 h-8 flex items-center justify-center text-[10px] font-medium tracking-wider uppercase transition-colors border-b-2 cursor-pointer ${
            activeTab === 0
              ? "text-text-primary border-accent"
              : "text-text-tertiary border-transparent hover:text-text-primary"
          }`}
        >
          Files
        </button>
        <button
          onClick={() => onTabChange(1)}
          className={`flex-1 h-8 flex items-center justify-center text-[10px] font-medium tracking-wider uppercase transition-colors border-b-2 cursor-pointer ${
            activeTab === 1
              ? "text-text-primary border-accent"
              : "text-text-tertiary border-transparent hover:text-text-primary"
          }`}
        >
          Outline
        </button>
      </div>

      {/* Files Panel */}
      {activeTab === 0 && (
        <div className="flex-1 overflow-y-auto flex flex-col">
          <div className="py-2 shrink-0">
            <div className="px-3 pb-1.5 flex items-center justify-between text-[10px] font-semibold tracking-wider uppercase text-text-tertiary">
              <span>Project</span>
              {!readOnly && onFileCreate && (
                <button
                  onClick={onFileCreate}
                  className="p-0.5 rounded hover:bg-bg-primary hover:text-text-primary transition-colors cursor-pointer"
                  title="Create new file"
                >
                  <Plus size={10} />
                </button>
              )}
            </div>
            <button
              onClick={() => setFoldersExpanded(!foldersExpanded)}
              className="w-full flex items-center gap-1.5 px-3 py-1 text-xs text-text-secondary hover:bg-bg-primary transition-colors cursor-pointer"
            >
              {foldersExpanded ? (
                <ChevronDown size={12} />
              ) : (
                <ChevronRight size={12} />
              )}
              <Folder size={13} className="text-accent" />
              <span className="truncate font-medium">{projectName || "thesis-draft"}</span>
            </button>
            {foldersExpanded && (
              <div className="pl-3 mt-0.5">
                {files.map((file) => {
                  const isActive = file.id === activeFileId;
                  return (
                    <button
                      key={file.id}
                      onClick={() => onFileSelect(file.id)}
                      className={`w-full flex items-center gap-1.5 px-3 py-1 text-xs transition-all cursor-pointer ${
                        isActive
                          ? "bg-accent-bg text-accent font-semibold"
                          : "text-text-secondary hover:bg-bg-primary"
                      }`}
                    >
                      <FileText size={13} className={isActive ? "text-accent" : "text-text-tertiary"} />
                      <span className="truncate">{file.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="h-px bg-border-secondary my-1 shrink-0" />

          {/* Collaborators List */}
          <div className="py-2 flex-1 flex flex-col min-h-0">
            <div className="px-3 pb-1.5 text-[10px] font-semibold tracking-wider uppercase text-text-tertiary shrink-0">
              Collaborators
            </div>
            <div className="flex-1 overflow-y-auto">
              {collaborators.map((collab, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-3 py-1 text-xs text-text-secondary"
                >
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold text-white shrink-0"
                    style={{ background: collab.color }}
                  >
                    {collab.initials}
                  </div>
                  <span className="truncate flex-1">{collab.name}</span>
                  {collab.online ? (
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" title="Online" />
                  ) : (
                    <span className="text-[9px] text-text-tertiary shrink-0">Offline</span>
                  )}
                </div>
              ))}
              {collaborators.length === 0 && (
                <div className="px-3 text-[10px] text-text-tertiary italic">
                  No other collaborators.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Outline Panel */}
      {activeTab === 1 && (
        <div className="flex-1 overflow-y-auto">
          <div className="py-2">
            <div className="px-3 pb-1.5 text-[10px] font-semibold tracking-wider uppercase text-text-tertiary">
              Structure
            </div>
            {outline.map((item, idx) => (
              <button
                key={idx}
                className={`w-full flex items-center gap-1.5 text-xs text-text-secondary hover:bg-bg-primary transition-colors cursor-pointer ${
                  item.indent ? "pl-6" : "pl-3"
                } py-1 pr-3`}
              >
                <FileText size={13} className="text-text-tertiary shrink-0" />
                <span className="truncate">{item.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}