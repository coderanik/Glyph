"use client";

import { Folder, Users, Plus } from "lucide-react";

import Image from "next/image";

const projects = [
  { id: 1, name: "Thesis Main", active: true },
  { id: 2, name: "CV - 2026", active: false },
  { id: 3, name: "ML Report", active: false },
];

export default function Sidebar() {
  return (
    <aside className="w-48 bg-zinc-900 dark:bg-[#111111] text-zinc-400 flex flex-col h-screen border-r border-zinc-200 dark:border-zinc-800/50 shrink-0">
      <div className="h-12 border-b border-zinc-200 dark:border-zinc-800/50 flex items-center px-4 gap-2 text-white font-medium text-sm tracking-wide">
        <Image src="/logo.png" alt="Glyph Logo" width={20} height={20} className="rounded-[4px] shrink-0" />
        <span className="text-zinc-800 dark:text-zinc-100">Glyph</span>
      </div>

      <div className="flex-1 overflow-y-auto py-3 space-y-5 scrollbar-hide">
        <div>
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1 px-4">
            Projects
            <button className="hover:text-zinc-300 transition-colors">
              <Plus size={12} />
            </button>
          </div>
          <nav className="space-y-0.5 px-2">
            {projects.map((p) => (
              <button
                key={p.id}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-all ${
                  p.active
                    ? "bg-zinc-200 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 font-medium"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400"
                }`}
              >
                <Folder size={14} className={p.active ? "text-green-600" : "opacity-70"} />
                {p.name}
              </button>
            ))}
          </nav>
        </div>

        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1 px-4">
            Shared
          </div>
          <nav className="space-y-0.5 px-2">
            <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 transition-all">
              <Users size={14} className="opacity-70" />
              Collaborators
            </button>
          </nav>
        </div>
      </div>

      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800/50 flex items-center justify-between text-[10px] font-medium text-zinc-500 uppercase tracking-widest">
        <span>Version</span>
        <span className="text-zinc-400 dark:text-zinc-600">v0.1.0</span>
      </div>
    </aside>
  );
}
