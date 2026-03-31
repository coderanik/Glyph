"use client";

import {
  FileText,
  Search,
  Users,
  History,
  Settings,
  PanelLeft,
} from "lucide-react";

type ActivityBarProps = {
  activeItem: number;
  onItemClick: (index: number) => void;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
};

const items = [
  { icon: FileText, label: "Explorer" },
  { icon: Search, label: "Search" },
  { icon: Users, label: "Collaborators" },
  { icon: History, label: "History" },
];

export default function ActivityBar({
  activeItem,
  onItemClick,
  onToggleSidebar,
  sidebarOpen,
}: ActivityBarProps) {
  return (
    <div className="w-11 shrink-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col items-center py-2 gap-0.5">
      <button
        onClick={onToggleSidebar}
        className="w-8 h-8 rounded-md flex items-center justify-center text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
      >
        <PanelLeft size={16} />
      </button>

      <div className="h-px w-6 bg-zinc-200 dark:bg-zinc-800 my-1" />

      {items.map((item, index) => {
        const Icon = item.icon;
        const isActive = activeItem === index;
        return (
          <button
            key={index}
            onClick={() => onItemClick(index)}
            className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
              isActive
                ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
            title={item.label}
          >
            <Icon size={16} />
          </button>
        );
      })}

      <div className="flex-1" />

      <button
        className="w-8 h-8 rounded-md flex items-center justify-center text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        title="Settings"
      >
        <Settings size={16} />
      </button>
    </div>
  );
}