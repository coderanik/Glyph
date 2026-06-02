"use client";

import {
  FileText,
  Search,
  Users,
  History,
  Settings,
  PanelLeft,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";

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
  { icon: Sparkles, label: "AI Assistant" },
];

export default function ActivityBar({
  activeItem,
  onItemClick,
  onToggleSidebar,
  sidebarOpen,
}: ActivityBarProps) {
  const router = useRouter();
  return (
    <div className="w-11 shrink-0 bg-bg-primary border-r border-border-secondary flex flex-col items-center py-2 gap-0.5">
      <button
        onClick={onToggleSidebar}
        className="w-8 h-8 rounded-md flex items-center justify-center text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors"
        title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
      >
        <PanelLeft size={16} />
      </button>

      <div className="h-px w-6 bg-border-secondary my-1" />

      {items.map((item, index) => {
        const Icon = item.icon;
        const isActive = activeItem === index;
        return (
          <button
            key={item.label}
            onClick={() => onItemClick(index)}
            className={`w-8 h-8 rounded-md flex items-center justify-center transition-all ${
              isActive
                ? "bg-accent-bg text-accent font-medium shadow-sm"
                : "text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
            }`}
            title={item.label}
          >
            <Icon size={16} />
          </button>
        );
      })}

      <div className="flex-1" />

      <button
        onClick={() => router.push("/settings")}
        className="w-8 h-8 rounded-md flex items-center justify-center text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors cursor-pointer"
        title="Settings"
      >
        <Settings size={16} />
      </button>
    </div>
  );
}