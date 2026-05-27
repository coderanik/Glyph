"use client";

import Sidebar from "@/components/Sidebar";
import UserDropdown from "@/components/UserDropdown";
import { useRouter } from "next/navigation";
import { ChevronLeft, User, Mail, Shield } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  const name = isLoaded && user ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "User" : "Loading...";
  const email = isLoaded && user ? user.primaryEmailAddress?.emailAddress ?? "N/A" : "Loading...";
  const userInitials = isLoaded && user ? (user.firstName?.[0] ?? "").toUpperCase() + (user.lastName?.[0] ?? "").toUpperCase() || "U" : "U";

  return (
    <div className="flex bg-white dark:bg-zinc-950 h-screen overflow-hidden text-zinc-900 dark:text-zinc-100">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-12 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-4 shrink-0 transition-colors">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <h2 className="text-sm font-medium tracking-tight">Profile</h2>
          </div>
          <UserDropdown />
        </header>

        <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full">
          <div className="space-y-8">
            <section>
              <h3 className="text-lg font-semibold mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                Personal Information
              </h3>
              <div className="grid gap-6">
                <div className="flex items-center gap-4">
                  {isLoaded && user?.imageUrl ? (
                    <Image
                      src={user.imageUrl}
                      alt="Avatar"
                      width={64}
                      height={64}
                      className="rounded-full border border-zinc-200 dark:border-zinc-800"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xl font-bold text-zinc-500">
                      {userInitials}
                    </div>
                  )}
                  <div className="text-xs text-zinc-500">
                    Manage your avatar and other profile settings directly through Clerk.
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                      Full Name
                    </label>
                    <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md text-sm">
                      <User size={14} className="text-zinc-400" />
                      <span>{name}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                      Email Address
                    </label>
                    <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md text-sm">
                      <Mail size={14} className="text-zinc-400" />
                      <span>{email}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>


            <section>
              <h3 className="text-lg font-semibold mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                Security
              </h3>
              <div className="space-y-4">
                <button className="flex items-center justify-between w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Shield size={18} className="text-zinc-400" />
                    <div className="text-left">
                      <div className="text-sm font-medium">Password</div>
                      <div className="text-xs text-zinc-500">
                        Last changed 3 months ago
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-green-600">
                    Update
                  </span>
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
