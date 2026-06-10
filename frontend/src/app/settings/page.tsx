"use client";

import Sidebar from "@/components/Sidebar";
import UserDropdown from "@/components/UserDropdown";
import { useRouter } from "next/navigation";
import { ChevronLeft, Bell, Sliders, Shield } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();

  return (
    <div className="flex bg-white dark:bg-zinc-950 h-screen overflow-hidden text-zinc-900 dark:text-zinc-100">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-12 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-4 shrink-0 transition-colors">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <h2 className="text-sm font-medium tracking-tight">Settings</h2>
          </div>
          <UserDropdown />
        </header>

        <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full">
          <div className="space-y-10">
            <section className="space-y-4">
              <h3 className="text-lg font-semibold mb-1 border-b border-zinc-200 dark:border-zinc-800 pb-2">Preferences</h3>
              
              <div className="space-y-3">
                {[
                  { icon: Bell, label: "Notifications", desc: "Configure how you receive alerts." },
                  { icon: Sliders, label: "Editor Settings", desc: "Auto-save, font size, and keybindings." },
                  { icon: Shield, label: "Privacy", desc: "Manage data sharing and visibility." },
                ].map((pref) => (
                  <button
                    key={pref.label}
                    className="flex items-center justify-between w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <pref.icon size={18} className="text-zinc-400" />
                      <div className="text-left">
                        <div className="text-sm font-medium">{pref.label}</div>
                        <div className="text-xs text-zinc-500">{pref.desc}</div>
                      </div>
                    </div>
                    <ChevronLeft size={16} className="text-zinc-300 rotate-180" />
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
