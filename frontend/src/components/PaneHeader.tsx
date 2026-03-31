"use client";

import { WrapText, Focus, Download, Maximize, Link } from "lucide-react";

type PaneHeaderProps = {
  title: string;
  subtitle?: string;
  type: "editor" | "preview";
  compileStatus?: string;
  onWrapToggle?: () => void;
  onFocusToggle?: () => void;
  onDownload?: () => void;
  onFullscreen?: () => void;
};

export default function PaneHeader({
  title,
  subtitle,
  type,
  compileStatus,
}: PaneHeaderProps) {
  return (
    <div className="h-7 shrink-0 flex items-center gap-1.5 px-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
      <span className="text-[11px] font-medium tracking-wider uppercase text-zinc-500">
        {title}
      </span>
      {subtitle && (
        <span className="text-[10px] text-zinc-500">{subtitle}</span>
      )}
      {type === "preview" && compileStatus && (
        <span className="text-[10px] text-zinc-500 ml-2">{compileStatus}</span>
      )}

      <div className="ml-auto flex items-center gap-1">
        {type === "editor" && (
          <>
            <button
              className="w-5 h-5 rounded flex items-center justify-center text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
              title="Wrap lines"
            >
              <WrapText size={12} />
            </button>
            <button
              className="w-5 h-5 rounded flex items-center justify-center text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
              title="Focus mode"
            >
              <Focus size={12} />
            </button>
          </>
        )}
        {type === "preview" && (
          <>
            <button
              className="w-5 h-5 rounded flex items-center justify-center text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
              title="Sync scroll"
            >
              <Link size={12} />
            </button>
            <button
              className="w-5 h-5 rounded flex items-center justify-center text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
              title="Download PDF"
            >
              <Download size={12} />
            </button>
            <button
              className="w-5 h-5 rounded flex items-center justify-center text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
              title="Fullscreen"
            >
              <Maximize size={12} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}