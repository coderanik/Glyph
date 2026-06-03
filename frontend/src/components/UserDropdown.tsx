"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Settings, User, LogOut } from "lucide-react";
import { useUser, useAuth } from "@clerk/nextjs";
import { apiUrl } from "@/lib/api";
import { logError } from "@/lib/errorLogger";

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
  
  const { user, isSignedIn, isLoaded } = useUser();
  const { signOut, getToken } = useAuth();
  const [backendVerified, setBackendVerified] = useState<boolean | null>(null);

  // Verify backend connectivity via Clerk token
  useEffect(() => {
    if (!isSignedIn) {
      const t = setTimeout(() => setBackendVerified(null), 0);
      return () => clearTimeout(t);
    }
    
    let active = true;
    async function verifyBackend() {
      try {
        const token = await getToken();
        if (!token) return;
        
        const res = await fetch(apiUrl("/auth/me"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (res.ok && active) {
          setBackendVerified(true);
        } else if (active) {
          setBackendVerified(false);
        }
      } catch (err) {
        logError("Error verifying backend connection:", err);
        if (active) {
          setBackendVerified(false);
        }
      }
    }
    
    verifyBackend();
    return () => {
      active = false;
    };
  }, [isSignedIn, getToken]);

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

  const handleLogout = async () => {
    await signOut();
    setIsOpen(false);
    router.push("/sign-in");
  };

  if (!isLoaded) {
    return (
      <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" aria-hidden />
    );
  }

  if (!isSignedIn || !user) {
    return (
      <Link
        href="/sign-in"
        className="text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-green-600 dark:hover:text-green-400 px-2 py-1 rounded transition-colors"
      >
        Sign in
      </Link>
    );
  }

  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "User";
  const userLabel = initialsFromName(name);

  return (
    <div className="relative flex items-center gap-2" ref={dropdownRef}>
      {/* Backend connection indicator */}
      {backendVerified === false && (
        <span 
          className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" 
          title="Disconnected from authentication backend"
        />
      )}
      {backendVerified === true && (
        <span 
          className="w-1.5 h-1.5 rounded-full bg-green-500" 
          title="Successfully authenticated with backend"
        />
      )}

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
          <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800/60">
            <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">{name}</p>
            <p className="text-[10px] text-zinc-400 truncate">{user.primaryEmailAddress?.emailAddress}</p>
          </div>
          
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
