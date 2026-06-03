"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser, useAuth } from "@clerk/nextjs";
import { apiUrl } from "@/lib/api";
import { logError } from "@/lib/errorLogger";

function ShareAcceptInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { isLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const [status, setStatus] = useState("Processing invitation...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      // Redirect to sign-up and pass redirect_url back to this page
      const currentUrl = encodeURIComponent(window.location.href);
      router.push(`/sign-up?redirect_url=${currentUrl}`);
      return;
    }

    if (!token) {
      setTimeout(() => setError("Invalid or missing invitation token."), 0);
      return;
    }

    async function acceptInvite() {
      try {
        const authToken = await getToken();
        if (!authToken) {
          setError("Session expired. Please log in again.");
          return;
        }

        const res = await fetch(apiUrl("/projects/share/accept"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ token }),
        });

        if (res.ok) {
          const data = await res.json();
          setStatus("Invitation accepted! Opening editor...");
          router.push(`/projects/${data.projectId}`);
        } else {
          const errText = await res.text();
          setError(errText || "Failed to accept sharing invitation.");
        }
      } catch (err: unknown) {
        logError("Accept invite error:", err);
        setError("Failed to connect to server. Please try again.");
      }
    }

    acceptInvite();
  }, [isLoaded, isSignedIn, token, router, getToken]);

  return (
    <div className="flex h-screen items-center justify-center bg-bg-tertiary text-text-primary select-none">
      <div className="flex flex-col items-center gap-3 max-w-sm text-center px-6 animate-in fade-in duration-200">
        {!error ? (
          <>
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold text-text-secondary tracking-wide uppercase">{status}</p>
          </>
        ) : (
          <>
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/20 flex items-center justify-center text-red-500 mb-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="font-semibold text-sm mb-1 text-text-primary">Invitation Error</h3>
            <p className="text-[11px] text-text-secondary leading-relaxed mb-4">{error}</p>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-4 py-1.5 bg-accent hover:bg-accent-hover text-white text-[11px] font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
            >
              Go to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ShareAcceptPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-bg-tertiary">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ShareAcceptInner />
    </Suspense>
  );
}
