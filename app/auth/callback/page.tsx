"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import { getCurrentUser } from "@/lib/api/user";
import { Loader2 } from "lucide-react";

/**
 * Read the intended sign-in role.
 * Priority: 1) URL param ?type= (set by afterSignInUrl)
 *           2) localStorage fallback (set before the OAuth redirect)
 */
function resolveRole(urlType: string | null): "personal" | "enterprise" | null {
  if (urlType === "enterprise" || urlType === "personal") return urlType;

  // Fallback: consume from localStorage (set by storeSignInRole() on sign-in page)
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("meetgov:signin_role") as "personal" | "enterprise" | null;
    if (stored) {
      localStorage.removeItem("meetgov:signin_role");
      return stored;
    }
  }

  return null;
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoaded } = useUser();
  const { user: clerkUser } = useClerk();
  const [error, setError] = useState<string | null>(null);

  const urlType = searchParams.get("type");
  const isNewUser = searchParams.get("new") === "true";

  useEffect(() => {
    const handleRedirect = async () => {
      if (!isLoaded) return;

      if (!user) {
        router.push("/auth/signin?error=auth_failed");
        return;
      }

      // Resolve the intended role — survives OAuth redirect via localStorage backup
      const role = resolveRole(urlType);

      try {
        if (role === "enterprise" || isNewUser) {
          // Store the intended role in Clerk's unsafeMetadata for the backend to read
          // This is only needed on first sign-in (new=true) to set the intended userType
          if (isNewUser && clerkUser) {
            await clerkUser.update({
              unsafeMetadata: {
                ...clerkUser.unsafeMetadata,
                intendedRole: role ?? "personal",
              },
            });
          }
        }

        // Ask our backend what this user's actual type is
        const userInfo = await getCurrentUser();

        if (role === "enterprise" || userInfo.userType === "enterprise") {
          // Enterprise: go to onboarding if no org yet, else enterprise dashboard
          router.push(userInfo.enterprise ? "/dashboard/enterprise" : "/onboarding/enterprise");
        } else {
          router.push("/dashboard");
        }
      } catch {
        // Backend not available or first-time user — route by intended role
        if (role === "enterprise") {
          router.push("/onboarding/enterprise");
        } else {
          router.push("/dashboard");
        }
      }
    };

    handleRedirect();
  }, [user, isLoaded, urlType, isNewUser, router, clerkUser]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={() => router.push("/auth/signin")} className="text-violet-400 underline">
            Return to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
        <p className="text-slate-400">Completing sign in...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
            <p className="text-slate-400">Loading...</p>
          </div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
