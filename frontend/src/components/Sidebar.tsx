"use client";

import { FileText, Folder, Settings, Users, Plus } from "lucide-react";

const projects = [
  { id: 1, name: "Thesis Main", active: true },
  { id: 2, name: "CV - 2026", active: false },
  { id: 3, name: "ML Report", active: false },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-gray-900 text-gray-300 flex flex-col h-screen border-r border-gray-800">
      <div className="p-4 border-b border-gray-800 flex items-center gap-2 text-white font-bold text-xl">
        <div className="w-8 h-8 bg-indigo-500 rounded flex items-center justify-center">
          <span className="text-white">T</span>
        </div>
        Glyph
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 px-2">
            Projects
            <button className="hover:text-white transition-colors">
              <Plus size={14} />
            </button>
          </div>
          <nav className="space-y-1">
            {projects.map((p) => (
              <button
                key={p.id}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                  p.active
                    ? "bg-indigo-600 text-white"
                    : "hover:bg-gray-800 hover:text-white dark:hover:bg-gray-800"
                }`}
              >
                <Folder size={18} />
                {p.name}
              </button>
            ))}
          </nav>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 px-2">
            Shared
          </div>
          <nav className="space-y-1">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-gray-800 hover:text-white transition-all text-gray-300">
              <Users size={18} />
              Collaborators
            </button>
          </nav>
        </div>
      </div>

      <div className="p-4 border-t border-gray-800 space-y-1">
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-gray-800 hover:text-white transition-all text-gray-300">
          <Settings size={18} />
          Settings
        </button>
      </div>
    </aside>
  );
}
