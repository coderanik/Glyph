"use client";

import { FileText } from "lucide-react";

type EditorTabsProps = {
  tabs: { name: string; active: boolean; hasUnsavedChanges?: boolean }[];
  onTabClick: (index: number) => void;
};

export default function EditorTabs({
  tabs,
  onTabClick,
}: EditorTabsProps) {
  return (
    <div className="h-[34px] shrink-0 flex items-center border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 overflow-x-auto">
      {tabs.map((tab, idx) => (
        <button
          key={idx}
          onClick={() => onTabClick(idx)}
          className={`h-full flex items-center gap-1.5 px-3 text-xs border-r border-zinc-200 dark:border-zinc-800 transition-colors relative ${
            tab.active
              ? "bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
              : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }`}
        >
          <FileText size={12} />
          <span>{tab.name}</span>
          {tab.hasUnsavedChanges && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          )}
          {tab.active && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
          )}
        </button>
      ))}
    </div>
  );
}