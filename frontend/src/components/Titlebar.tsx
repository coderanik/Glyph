"use client";

import { Loader2, Home } from "lucide-react";
import Link from "next/link";

type TitlebarProps = {
  projectName: string;
  fileName: string;
  isCompiling: boolean;
  onCompile: () => void;
  canCompile: boolean;
  autoCompile?: boolean;
  onAutoCompileToggle?: () => void;
  theme?: "light" | "dark";
  onThemeToggle?: () => void;
  collaborators?: { id: string; name: string; initials: string; color: string; online: boolean; imageUrl: string | null }[];
  onShareClick?: () => void;
};

function IconSun({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" />
    </svg>
  );
}

function IconMoon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.5 8.5A5.5 5.5 0 117.5 2.5a4 4 0 006 6z" />
    </svg>
  );
}



export default function Titlebar({
  projectName,
  fileName,
  isCompiling,
  onCompile,
  canCompile,
  autoCompile = false,
  onAutoCompileToggle,
  theme,
  onThemeToggle,
  collaborators = [],
  onShareClick,
}: TitlebarProps) {
  return (
    <header className="h-10 shrink-0 flex items-center justify-between px-3 bg-bg-primary border-b border-border-secondary relative">
      {/* Home / logo on the left */}
      <div className="flex items-center z-10">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors cursor-pointer select-none"
          title="Go to Dashboard"
        >
          <Home size={13} className="text-accent" />
          <span className="text-[12px] font-semibold tracking-wide font-sans">Glyph</span>
        </Link>
      </div>

      {/* Project name absolutely centered to remain perfectly centered */}
      <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
        <span className="text-[13px] font-medium text-text-primary">
          {projectName}
        </span>
        <span className="text-[13px] text-text-tertiary"> / {fileName}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 z-10">
        {/* Collaborator avatars */}
        <div className="flex -space-x-1.5 mr-1.5">
          {collaborators.map((c) => (
            <div
              key={c.id}
              className={`w-5.5 h-5.5 rounded-full flex items-center justify-center overflow-hidden text-[8px] font-bold text-white border border-bg-primary select-none ${
                c.online ? "ring-[1.5px] ring-green-400" : ""
              }`}
              style={{ background: c.color }}
              title={`${c.name} (${c.online ? 'Online' : 'Offline'})`}
            >
              {c.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover" />
              ) : (
                c.initials
              )}
            </div>
          ))}
        </div>

        {/* Auto-compile toggle */}
        {onAutoCompileToggle && canCompile && (
          <button
            type="button"
            role="switch"
            aria-checked={autoCompile}
            onClick={onAutoCompileToggle}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border border-border-primary text-text-secondary hover:bg-bg-secondary transition-colors cursor-pointer select-none"
            title={autoCompile ? "Auto-compile on — click to turn off" : "Auto-compile off — click to turn on"}
          >
            <span
              className={`relative inline-flex h-3.5 w-6 shrink-0 items-center rounded-full transition-colors ${
                autoCompile ? "bg-accent" : "bg-bg-tertiary"
              }`}
            >
              <span
                className={`absolute h-2.5 w-2.5 rounded-full bg-white shadow-sm transition-transform ${
                  autoCompile ? "translate-x-3" : "translate-x-0.5"
                }`}
              />
            </span>
            <span>Auto</span>
          </button>
        )}

        {/* Compile button */}
        <button
          onClick={onCompile}
          disabled={isCompiling || !canCompile}
          className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors cursor-pointer select-none ${
            isCompiling || !canCompile
              ? "bg-bg-secondary text-text-tertiary cursor-not-allowed"
              : "bg-accent hover:bg-accent-hover text-[#0e0f11] font-semibold"
          }`}
        >
          {isCompiling ? (
            <>
              <Loader2 size={10} className="animate-spin" />
              <span>Compiling…</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
              <span>Compile</span>
            </>
          )}
        </button>

        {/* Share button */}
        <button
          onClick={onShareClick}
          className="px-2.5 py-0.5 rounded-full text-[11px] font-medium text-text-secondary border border-border-primary hover:bg-bg-secondary transition-colors cursor-pointer select-none"
        >
          Share
        </button>

        {/* Theme Toggle */}
        {onThemeToggle && theme && (
          <button
            onClick={onThemeToggle}
            className="w-5 h-5 flex items-center justify-center rounded-full text-text-secondary border border-border-primary hover:bg-bg-secondary transition-colors"
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          >
            {theme === "light" ? <IconMoon size={10} /> : <IconSun size={10} />}
          </button>
        )}
      </div>
    </header>
  );
}