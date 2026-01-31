"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { signIn, useSession } from "@/lib/auth-client";
import { getCurrentUser } from "@/lib/api/user";
import { AlertCircle, Loader2 } from "lucide-react";

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending: isSessionLoading } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userType = searchParams.get("type"); // 'personal' or 'enterprise'
  const callbackError = searchParams.get("error");

  useEffect(() => {
    if (callbackError) {
      setError("Authentication failed. Please try again.");
    }
  }, [callbackError]);

  useEffect(() => {
    const handlePostLogin = async () => {
      if (session?.user && !isRedirecting) {
        setIsRedirecting(true);
        try {
          const userInfo = await getCurrentUser();
          
          if (userInfo.userType === "enterprise") {
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
          // API failed - session might be stale, stay on signin page
          console.error("Failed to fetch user info:", err);
          setIsRedirecting(false);
        }
      }
    };

    if (!isSessionLoading && session?.user) {
      handlePostLogin();
    }
  }, [session, isSessionLoading, router, isRedirecting]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Determine callback URL based on user type selection
      // Must be absolute URL pointing to frontend
      const baseUrl = window.location.origin;
      const callbackURL = userType === "enterprise" 
        ? `${baseUrl}/auth/callback?type=enterprise` 
        : `${baseUrl}/auth/callback?type=personal`;

      await signIn.social({
        provider: "google",
        callbackURL,
      });
    } catch (err) {
      console.error("Sign in error:", err);
      setError("Failed to sign in with Google. Please try again.");
      setIsLoading(false);
    }
  };

  const handleGuestContinue = () => {
    router.push("/create-meeting");
  };

  // Show loading state while checking session
  if (isSessionLoading || isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">
            {isRedirecting ? "Redirecting..." : "Checking session..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center space-y-2 pb-6">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold">
            {userType === "enterprise" ? "Enterprise Sign In" : "Welcome to MeetAssist"}
          </CardTitle>
          <CardDescription className="text-base">
            {userType === "enterprise" 
              ? "Sign in to access your organization's meeting tools and analytics."
              : "Sign in to record, transcribe, and get AI notes for your meetings automatically."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            variant="outline"
            className="w-full h-12 text-base font-medium relative"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            aria-label="Sign in with Google"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin mr-3" />
                Signing in...
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </div>
            )}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <Button
            variant="ghost"
            className="w-full"
            onClick={handleGuestContinue}
            aria-label="Continue as guest"
          >
            Continue as Guest
          </Button>

          {!userType && (
            <div className="pt-4 border-t">
              <p className="text-sm text-center text-muted-foreground mb-3">
                Are you an enterprise user?
              </p>
              <Button
                variant="link"
                className="w-full text-primary"
                onClick={() => router.push("/auth/signin?type=enterprise")}
              >
                Sign in as Enterprise User
              </Button>
            </div>
          )}

          {userType === "enterprise" && (
            <div className="pt-4 border-t">
              <Button
                variant="link"
                className="w-full text-muted-foreground"
                onClick={() => router.push("/auth/signin")}
              >
                ← Back to Personal Sign In
              </Button>
            </div>
          )}

          <p className="text-xs text-center text-muted-foreground">
            By signing in, you agree to our{" "}
            <a href="/terms" className="underline hover:text-primary">Terms of Service</a>
            {" "}and{" "}
            <a href="/privacy" className="underline hover:text-primary">Privacy Policy</a>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}
