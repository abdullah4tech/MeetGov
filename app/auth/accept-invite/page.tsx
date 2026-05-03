"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { acceptInvite } from "@/lib/api/enterprise";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoaded } = useUser();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "auth_required">("loading");
  const [error, setError] = useState<string | null>(null);
  const [enterpriseName, setEnterpriseName] = useState<string | null>(null);

  const token = searchParams.get("token");

  useEffect(() => {
    const handleAcceptInvite = async () => {
      if (!token) {
        setStatus("error");
        setError("Invalid invite link. Please check the link and try again.");
        return;
      }

      if (!user) {
        if (isLoaded) {
          setStatus("auth_required");
        }
        return;
      }

      try {
        const result = await acceptInvite(token);
        setEnterpriseName(result.enterprise.name);
        setStatus("success");
        
        // Redirect after a short delay
        setTimeout(() => {
          router.push("/dashboard/enterprise");
        }, 2000);
      } catch (err: unknown) {
        const error = err as { response?: { data?: { error?: string } } };
        setStatus("error");
        setError(error.response?.data?.error || "Failed to accept invite. Please try again.");
      }
    };

    if (isLoaded) {
      handleAcceptInvite();
    }
  }, [token, user, isLoaded, router]);

  const handleSignIn = () => {
    // Redirect to sign in, then come back here
    const callbackUrl = encodeURIComponent(`/auth/accept-invite?token=${token}`);
    router.push(`/auth/signin?type=enterprise&callback=${callbackUrl}`);
  };

  if (!isLoaded || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Processing invite...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        {status === "auth_required" && (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">Sign In Required</CardTitle>
              <CardDescription>
                Please sign in to accept this organization invite.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full" onClick={handleSignIn}>
                Sign In with Google
              </Button>
            </CardContent>
          </>
        )}

        {status === "success" && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl font-bold">Welcome!</CardTitle>
              <CardDescription>
                You've successfully joined {enterpriseName}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground text-sm">
                Redirecting to your dashboard...
              </p>
            </CardContent>
          </>
        )}

        {status === "error" && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl font-bold">Unable to Accept Invite</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <Button variant="outline" className="w-full" onClick={() => router.push("/auth/signin")}>
                Return to Sign In
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  );
}
