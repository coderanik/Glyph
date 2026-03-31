"use client";

import { Loader2 } from "lucide-react";

type TitlebarProps = {
  projectName: string;
  fileName: string;
  isCompiling: boolean;
  onCompile: () => void;
  canCompile: boolean;
};

const collaborators = [
  { name: "Anik (you)", initials: "AN", color: "#7c9fcc" },
  { name: "Priya", initials: "PR", color: "#e07b7b" },
  { name: "Keanu", initials: "KN", color: "#7dbf7a" },
];

export default function Titlebar({
  projectName,
  fileName,
  isCompiling,
  onCompile,
  canCompile,
}: TitlebarProps) {
  return (
    <header className="h-10 shrink-0 flex items-center gap-2 px-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
      {/* macOS dots */}
      <div className="flex gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
        <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
      </div>

      {/* Project name */}
      <div className="flex-1 text-center">
        <span className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100">
          {projectName}
        </span>
        <span className="text-[13px] text-zinc-500 dark:text-zinc-400"> / {fileName}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        {/* Collaborator avatars */}
        <div className="flex -space-x-1.5">
          {collaborators.map((c, idx) => (
            <div
              key={idx}
              className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-medium text-white border border-white dark:border-zinc-900"
              style={{ background: c.color }}
              title={c.name}
            >
              {c.initials}
            </div>
          ))}
        </div>

        {/* Compile button */}
        <button
          onClick={onCompile}
          disabled={isCompiling || !canCompile}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
            isCompiling || !canCompile
              ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700 text-white"
          }`}
        >
          {isCompiling ? (
            <>
              <Loader2 size={10} className="animate-spin" />
              <span>Compiling…</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span>Compile</span>
            </>
          )}
        </button>

        {/* Share button */}
        <button className="px-2 py-0.5 rounded-full text-[11px] text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
          Share
        </button>
      </div>
    </header>
  );
}