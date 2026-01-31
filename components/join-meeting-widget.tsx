"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyRound, ArrowRight, FileText } from "lucide-react";
import { getMeetingByAccessCode, AccessCodeResponse } from "@/lib/api/meeting";
import { ensureGuestSession } from "@/lib/api/guest-session";

interface JoinMeetingWidgetProps {
  className?: string;
}

export function JoinMeetingWidget({ className }: JoinMeetingWidgetProps) {
  const router = useRouter();
  const [accessCode, setAccessCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meetingData, setMeetingData] = useState<AccessCodeResponse | null>(null);

  // Route based on meeting state
  const routeToMeeting = useCallback((meeting: AccessCodeResponse, code: string) => {
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

    // ENDED / COMPLETED → Results or Processing
    if (status === "ENDED" || status === "COMPLETED") {
      if (processingStatus === "PROCESSING") {
        router.push(`/meeting/${id}/processing${codeParam}`);
        return;
      }
      if (processingStatus === "COMPLETED" || processingStatus === "FAILED") {
        router.push(`/meeting/${id}/results${codeParam}`);
        return;
      }
      router.push(`/meeting/${id}/results${codeParam}`);
      return;
    }

    // Default fallback
    router.push(`/meeting/${id}${codeParam}`);
  }, [router]);

  const routeToArtifacts = useCallback((meeting: AccessCodeResponse, code: string) => {
    router.push(`/meeting/${meeting.id}/artifacts?code=${code}`);
  }, [router]);

  const handleLookup = async () => {
    if (!accessCode.trim()) {
      setError("Please enter an access code");
      return;
    }

    setIsLoading(true);
    setError(null);
    setMeetingData(null);

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

      // Store meeting data for action buttons
      setMeetingData(data);
    } catch (err) {
      console.error("Error looking up meeting:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleLookup();
    }
  };

  const getMeetingStatusText = (meeting: AccessCodeResponse) => {
    const { status, processingStatus } = meeting;
    
    if (status === "LIVE" || status === "ACTIVE") {
      return { text: "Live Now", color: "text-green-600 dark:text-green-400" };
    }
    if (status === "WAITING" || status === "SCHEDULED") {
      return { text: "Scheduled", color: "text-blue-600 dark:text-blue-400" };
    }
    if (status === "ENDED" || status === "COMPLETED") {
      if (processingStatus === "PROCESSING") {
        return { text: "Processing", color: "text-yellow-600 dark:text-yellow-400" };
      }
      return { text: "Completed", color: "text-gray-600 dark:text-gray-400" };
    }
    return { text: status, color: "text-gray-600" };
  };

  return (
    <div className={`w-full max-w-md ${className || ""}`}>
      <div className="bg-card border rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="h-5 w-5 text-primary" aria-hidden="true" />
          <h3 className="font-semibold">Have an Access Code?</h3>
        </div>
        
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter code (e.g., A1B2C3D4)"
              value={accessCode}
              onChange={(e) => {
                setAccessCode(e.target.value.toUpperCase());
                setError(null);
                setMeetingData(null);
              }}
              onKeyDown={handleKeyDown}
              className="text-center font-mono tracking-wider"
              maxLength={12}
              autoComplete="off"
              aria-label="Meeting access code"
              aria-invalid={!!error}
            />
            <Button 
              onClick={handleLookup}
              disabled={isLoading || !accessCode.trim()}
              aria-busy={isLoading}
              aria-label="Look up meeting"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" aria-hidden="true" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
            </Button>
          </div>

          {error && (
            <div 
              className="bg-destructive/10 text-destructive text-sm p-3 rounded-md text-center"
              role="alert"
              aria-live="polite"
            >
              {error}
            </div>
          )}

          {meetingData && (
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{meetingData.title}</p>
                  <p className={`text-xs ${getMeetingStatusText(meetingData).color}`}>
                    {getMeetingStatusText(meetingData).text}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={() => routeToMeeting(meetingData, accessCode.trim())}
                >
                  <ArrowRight className="h-4 w-4 mr-1" />
                  {meetingData.status === "LIVE" || meetingData.status === "ACTIVE" 
                    ? "Join Meeting" 
                    : "View Meeting"}
                </Button>
                
                {(meetingData.status === "ENDED" || meetingData.status === "COMPLETED") && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="flex-1"
                    onClick={() => routeToArtifacts(meetingData, accessCode.trim())}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Artifacts
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
