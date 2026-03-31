"use client";

import { useState } from "react";
import {
  FileText,
  Folder,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

type SidebarNewProps = {
  isOpen: boolean;
  activeTab: number;
  onTabChange: (tab: number) => void;
};

const files = [
  { name: "main.tex", active: true, hasWarning: false },
  { name: "references.bib", active: false, hasWarning: false },
  { name: "abstract.tex", active: false, hasWarning: true },
];

const outline = [
  { name: "1. Introduction", indent: 0 },
  { name: "1.1 Background", indent: 1 },
  { name: "1.2 Motivation", indent: 1 },
  { name: "2. Methodology", indent: 0 },
  { name: "3. Results", indent: 0 },
  { name: "4. Conclusion", indent: 0 },
];

const collaborators = [
  { name: "Anik (you)", initials: "AN", color: "#7c9fcc", online: true },
  { name: "Priya", initials: "PR", color: "#e07b7b", online: true },
  { name: "Keanu", initials: "KN", color: "#7dbf7a", online: false },
];

export default function SidebarNew({
  isOpen,
  activeTab,
  onTabChange,
}: SidebarNewProps) {
  const [foldersExpanded, setFoldersExpanded] = useState(true);

  if (!isOpen) return null;

  return (
    <aside className="w-[200px] shrink-0 bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden transition-all duration-200">
      {/* Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <button
          onClick={() => onTabChange(0)}
          className={`flex-1 h-8 flex items-center justify-center text-[10px] font-medium tracking-wider uppercase transition-colors border-b-2 ${
            activeTab === 0
              ? "text-zinc-900 dark:text-zinc-100 border-blue-500"
              : "text-zinc-500 border-transparent hover:text-zinc-700 dark:hover:text-zinc-300"
          }`}
        >
          Files
        </button>
        <button
          onClick={() => onTabChange(1)}
          className={`flex-1 h-8 flex items-center justify-center text-[10px] font-medium tracking-wider uppercase transition-colors border-b-2 ${
            activeTab === 1
              ? "text-zinc-900 dark:text-zinc-100 border-blue-500"
              : "text-zinc-500 border-transparent hover:text-zinc-700 dark:hover:text-zinc-300"
          }`}
        >
          Outline
        </button>
      </div>

      {/* Files Panel */}
      {activeTab === 0 && (
        <div className="flex-1 overflow-y-auto">
          <div className="py-2">
            <div className="px-3 pb-1.5 text-[10px] font-medium tracking-wider uppercase text-zinc-500">
              Project
            </div>
            <button
              onClick={() => setFoldersExpanded(!foldersExpanded)}
              className="w-full flex items-center gap-1.5 px-3 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {foldersExpanded ? (
                <ChevronDown size={12} />
              ) : (
                <ChevronRight size={12} />
              )}
              <Folder size={13} />
              <span>thesis-draft</span>
            </button>
            {foldersExpanded && (
              <div className="pl-4">
                {files.map((file, idx) => (
                  <button
                    key={idx}
                    className={`w-full flex items-center gap-1.5 px-3 py-1 text-xs transition-colors ${
                      file.active
                        ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <FileText size={13} className="text-zinc-400" />
                    <span>{file.name}</span>
                    {file.hasWarning && (
                      <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                        !
                      </span>
                    )}
                  </button>
                ))}
                <div className="flex items-center gap-1.5 px-3 py-1 text-xs text-zinc-500">
                  <Folder size={13} />
                  <span>figures/</span>
                </div>
              </div>
            )}
          </div>

          <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />

          <div className="py-2">
            <div className="px-3 pb-1.5 text-[10px] font-medium tracking-wider uppercase text-zinc-500">
              Collaborators
            </div>
            {collaborators.map((collab, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-3 py-1 text-xs text-zinc-600 dark:text-zinc-400"
              >
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-semibold text-white shrink-0"
                  style={{ background: collab.color }}
                >
                  {collab.initials}
                </div>
                <span>{collab.name}</span>
                {collab.online ? (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-400" />
                ) : (
                  <span className="ml-auto text-[10px] text-zinc-500">2h ago</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Outline Panel */}
      {activeTab === 1 && (
        <div className="flex-1 overflow-y-auto">
          <div className="py-2">
            <div className="px-3 pb-1.5 text-[10px] font-medium tracking-wider uppercase text-zinc-500">
              Structure
            </div>
            {outline.map((item, idx) => (
              <button
                key={idx}
                className={`w-full flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${
                  item.indent ? "pl-6" : "pl-3"
                } py-1 pr-3`}
              >
                <FileText size={13} className="text-zinc-400 shrink-0" />
                <span className="truncate">{item.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}