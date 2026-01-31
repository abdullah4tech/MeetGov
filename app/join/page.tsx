"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMeetingByAccessCode, AccessCodeResponse } from "@/lib/api/meeting";
import { ensureGuestSession } from "@/lib/api/guest-session";

export default function JoinMeetingPage() {
  const router = useRouter();
  const [accessCode, setAccessCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Route based on meeting state
  const routeBasedOnState = useCallback((meeting: AccessCodeResponse, code: string) => {
    const { id, status, processingStatus } = meeting;
    const codeParam = `?code=${code}`;

    // WAITING / SCHEDULED → Waiting Room
    if (status === "WAITING" || status === "SCHEDULED") {
      router.push(`/meeting/${id}/waiting${codeParam}`);
      return;
    }

    // LIVE / ACTIVE → Meeting Room
    if (status === "LIVE" || status === "ACTIVE") {
      router.push(`/meeting/${id}${codeParam}`);
      return;
    }

    // ENDED + PROCESSING → Processing Room
    if (status === "ENDED" || status === "COMPLETED") {
      if (processingStatus === "PROCESSING") {
        router.push(`/meeting/${id}/processing${codeParam}`);
        return;
      }

      // COMPLETED → Results Room
      if (processingStatus === "COMPLETED") {
        router.push(`/meeting/${id}/results${codeParam}`);
        return;
      }

      // FAILED → Processing Room (shows error)
      if (processingStatus === "FAILED") {
        router.push(`/meeting/${id}/processing${codeParam}`);
        return;
      }

      // Default: Go to results if meeting ended
      router.push(`/meeting/${id}/results${codeParam}`);
      return;
    }

    // CANCELLED / FAILED → Error display
    if (status === "CANCELLED" || status === "FAILED") {
      setError("This meeting has been cancelled or is no longer available.");
      return;
    }

    // Default fallback
    router.push(`/meeting/${id}${codeParam}`);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!accessCode.trim()) {
      setError("Please enter an access code");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Ensure guest session exists
      const sessionValid = await ensureGuestSession();
      if (!sessionValid) {
        setError("Failed to create session. Please refresh and try again.");
        return;
      }

      // Resolve meeting by access code
      const { data, error: apiError } = await getMeetingByAccessCode(accessCode.trim());

      if (apiError || !data) {
        setError(apiError?.message || "Meeting not found. Please check your access code.");
        return;
      }

      // Route based on meeting state
      routeBasedOnState(data, accessCode.trim());
    } catch (err) {
      console.error("Error joining meeting:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4" role="main">
      <Card className="max-w-md w-full" role="region" aria-labelledby="join-heading">
        <CardHeader className="text-center">
          <CardTitle id="join-heading" className="text-2xl">Join Meeting</CardTitle>
          <p className="text-muted-foreground text-sm mt-2" id="join-description">
            Enter your access code to join or view a meeting
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6" aria-describedby="join-description">
            <div className="space-y-2">
              <Label htmlFor="accessCode">Access Code</Label>
              <Input
                id="accessCode"
                type="text"
                placeholder="Enter access code (e.g., A1B2C3D4)"
                value={accessCode}
                onChange={(e) => {
                  setAccessCode(e.target.value.toUpperCase());
                  setError(null);
                }}
                className="text-center text-lg font-mono tracking-wider"
                maxLength={12}
                autoComplete="off"
                autoFocus
                aria-label="Meeting access code"
                aria-invalid={!!error}
                aria-describedby={error ? "access-code-error" : undefined}
              />
            </div>

            {error && (
              <div 
                id="access-code-error"
                className="bg-destructive/10 text-destructive text-sm p-3 rounded-md text-center"
                role="alert"
                aria-live="polite"
              >
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading || !accessCode.trim()}
              aria-busy={isLoading}
              aria-label={isLoading ? "Joining meeting" : "Join meeting with access code"}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2" aria-hidden="true" />
                  Joining...
                </>
              ) : (
                "Join Meeting"
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              <p>Don't have an access code?</p>
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto"
                onClick={() => router.push("/create-meeting")}
                aria-label="Navigate to create a new meeting"
              >
                Create a new meeting
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
