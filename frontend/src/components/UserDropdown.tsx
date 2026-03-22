"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Settings, User, LogOut } from "lucide-react";
import { apiUrl } from "@/lib/api";

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "?";
}

export default function UserDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [userLabel, setUserLabel] = useState("");

  const refreshAuth = useCallback(() => {
    const token = localStorage.getItem("glyph_token");
    if (!token) {
      setSignedIn(false);
      setUserLabel("");
      return;
    }
    setSignedIn(true);
    fetch(apiUrl("/auth/me"), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((u: { name?: string } | null) => {
        if (u?.name) setUserLabel(initialsFromName(u.name));
        else setUserLabel("?");
      })
      .catch(() => setUserLabel("?"));
  }, []);

  useEffect(() => {
    refreshAuth();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "glyph_token") refreshAuth();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refreshAuth]);

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
    setSignedIn(false);
    setUserLabel("");
    setIsOpen(false);
    router.push("/login");
  };

  if (signedIn === false) {
    return (
      <Link
        href="/login"
        className="text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-green-600 dark:hover:text-green-400 px-2 py-1 rounded transition-colors"
      >
        Sign in
      </Link>
    );
  }

  if (signedIn === null) {
    return (
      <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" aria-hidden />
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-600 dark:text-zinc-300 hover:ring-2 ring-zinc-300 dark:ring-zinc-700 transition-all focus:outline-none"
        title="Account"
      >
        {userLabel || "…"}
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
