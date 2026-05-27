"use client";

import { Circle, Clock, FileText, AlignLeft, CheckCircle, Loader2, Save } from "lucide-react";

type StatusBarProps = {
  connected: boolean;
  onlineCount: number;
  wordCount: number;
  hasErrors: boolean;
  errorCount: number;
  autoSaveStatus?: "saved" | "saving" | "idle";
};

export default function StatusBar({
  connected,
  onlineCount,
  wordCount,
  hasErrors,
  errorCount,
  autoSaveStatus = "idle",
}: StatusBarProps) {
  return (
    <footer className="h-6 shrink-0 flex items-center border-t border-border-secondary bg-bg-primary text-[11px] text-text-secondary">
      <div className="flex items-center gap-1 px-2 border-r border-border-secondary h-full">
        {connected ? (
          <Circle size={8} className="fill-green-500 text-green-500" />
        ) : (
          <Circle size={8} className="fill-red-500 text-red-500" />
        )}
        <span>{connected ? `Connected · ${onlineCount} online` : "Disconnected"}</span>
      </div>

      <div className="flex items-center gap-1 px-2 border-r border-border-secondary h-full">
        {autoSaveStatus === "saving" ? (
          <>
            <Loader2 size={11} className="animate-spin text-amber-500" />
            <span className="text-amber-600">Saving...</span>
          </>
        ) : autoSaveStatus === "saved" ? (
          <>
            <Save size={11} className="text-green-500" />
            <span className="text-green-600">Saved</span>
          </>
        ) : (
          <>
            <Clock size={11} />
            <span>Auto-save on</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-1 px-2 border-r border-border-secondary h-full">
        <AlignLeft size={11} />
        <span>{wordCount.toLocaleString()} words</span>
      </div>

      <div className="flex items-center gap-1 px-2 border-r border-border-secondary h-full">
        <FileText size={11} />
        <span>LaTeX · UTF-8</span>
      </div>

      <div className="flex items-center gap-1 px-2 ml-auto h-full">
        {hasErrors ? (
          <>
            <Circle size={8} className="fill-amber-500 text-amber-500" />
            <span className="text-amber-600 dark:text-amber-400">
              {errorCount} error{errorCount !== 1 ? "s" : ""}
            </span>
          </>
        ) : (
          <>
            <CheckCircle size={11} className="text-green-500" />
            <span className="text-green-600 dark:text-green-400">Compiled</span>
          </>
        )}
      </div>
    </footer>
  );
}