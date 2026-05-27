"use client";

import { WrapText, Focus, Download, Maximize, Link } from "lucide-react";

type PaneHeaderProps = {
  title: string;
  subtitle?: string;
  type: "editor" | "preview";
  compileStatus?: string;
  previewMode?: "pdf" | "live";
  onPreviewModeChange?: (mode: "pdf" | "live") => void;
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
  previewMode,
  onPreviewModeChange,
  onDownload,
}: PaneHeaderProps) {
  return (
    <div className="h-7 shrink-0 flex items-center gap-1.5 px-2.5 border-b border-border-secondary bg-bg-secondary">
      <span className="text-[11px] font-medium tracking-wider uppercase text-text-tertiary">
        {title}
      </span>
      {subtitle && (
        <span className="text-[10px] text-text-tertiary">{subtitle}</span>
      )}
      {type === "preview" && previewMode === "pdf" && compileStatus && (
        <span className="text-[10px] text-text-tertiary ml-2">{compileStatus}</span>
      )}

      {/* Removed Live HTML toggle switcher */}

      <div className="ml-auto flex items-center gap-1">
        {type === "editor" && (
          <>
            <button
              className="w-5 h-5 rounded flex items-center justify-center text-text-secondary hover:bg-bg-primary hover:text-text-primary transition-colors"
              title="Wrap lines"
            >
              <WrapText size={12} />
            </button>
            <button
              className="w-5 h-5 rounded flex items-center justify-center text-text-secondary hover:bg-bg-primary hover:text-text-primary transition-colors"
              title="Focus mode"
            >
              <Focus size={12} />
            </button>
          </>
        )}
        {type === "preview" && (
          <button
            onClick={onDownload}
            className="w-5 h-5 rounded flex items-center justify-center text-text-secondary hover:bg-bg-primary hover:text-text-primary transition-colors cursor-pointer"
            title="Download PDF"
          >
            <Download size={12} />
          </button>
        )}
      </div>
    </div>
  );
}