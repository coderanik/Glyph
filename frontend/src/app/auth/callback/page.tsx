"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      localStorage.setItem("glyph_token", token);
      router.push("/");
    } else {
      router.push("/login?error=OAuthFailed");
    }
  }, [router, searchParams]);

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-black">
      <div className="text-gray-900 dark:text-white">Authenticating...</div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-black">
          <div className="text-gray-900 dark:text-white">Loading...</div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
