"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { getCurrentUser } from "@/lib/api/user";
import { Loader2 } from "lucide-react";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending: isSessionLoading } = useSession();
  const [error, setError] = useState<string | null>(null);

  const userType = searchParams.get("type"); // 'personal' or 'enterprise'

  useEffect(() => {
    const handleRedirect = async () => {
      if (!session?.user) {
        // If no session after loading, redirect back to signin
        if (!isSessionLoading) {
          router.push("/auth/signin?error=auth_failed");
        }
        return;
      }

      try {
        const userInfo = await getCurrentUser();

        if (userType === "enterprise" || userInfo.userType === "enterprise") {
          if (userInfo.enterprise) {
            // Existing enterprise user - go to enterprise dashboard
            router.push("/dashboard/enterprise");
          } else {
            // First-time enterprise user - go to onboarding
            router.push("/onboarding/enterprise");
          }
        } else {
          // Personal user - go to personal dashboard
          router.push("/dashboard");
        }
      } catch (err) {
        console.error("Failed to determine user redirect:", err);
        // Default fallback - go to dashboard for authenticated users
        router.push("/dashboard");
      }
    };

    if (!isSessionLoading) {
      handleRedirect();
    }
  }, [session, isSessionLoading, userType, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <button
            onClick={() => router.push("/auth/signin")}
            className="text-primary underline"
          >
            Return to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
