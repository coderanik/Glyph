"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Settings, User, LogOut } from "lucide-react";

export default function UserDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown if clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  const handleLogout = () => {
    localStorage.removeItem("glyph_token");
    router.push("/login");
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500 hover:ring-2 ring-zinc-300 dark:ring-zinc-700 transition-all focus:outline-none"
      >
        AD
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md shadow-lg z-50 flex flex-col py-1 text-zinc-700 dark:text-zinc-300">
          <button 
            onClick={() => {
              setIsOpen(false);
              router.push("/profile");
            }}
            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800/50 w-full text-left transition-colors"
          >
            <User size={14} className="opacity-70" />
            Profile
          </button>
          
          <button 
            onClick={() => {
              setIsOpen(false);
              router.push("/settings");
            }}
            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800/50 w-full text-left transition-colors"
          >
            <Settings size={14} className="opacity-70" />
            Settings
          </button>
          
          <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1"></div>
          
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 w-full text-left transition-colors"
          >
            <LogOut size={14} className="opacity-70" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
