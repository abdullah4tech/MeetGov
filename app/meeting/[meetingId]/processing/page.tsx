"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  getMeetingProcessingStatus,
  ProcessingStatus,
  retryMeetingTranscription
} from "@/lib/api/meeting";
import { ensureGuestSession } from "@/lib/api/guest-session";
import { 
  useMeetingWebSocket,
  ProcessingCompletedEvent,
  ProcessingFailedEvent,
  TranscriptReadyEvent,
  ArtifactStartedEvent,
  ArtifactCompletedEvent,
  ArtifactFailedEvent,
  AllArtifactsCompletedEvent
} from "@/hooks/use-meeting-websocket";
import {
  getArtifactsStatus,
  ArtifactType,
  ArtifactStatus,
  retryArtifact
} from "@/lib/api/transcript";

type ArtifactStatusItem = {
  type: ArtifactType;
  status: ArtifactStatus | 'IDLE';
  artifactId: string | null;
  errorMessage: string | null;
};

export default function ProcessingRoomPage() {
  const params = useParams();
  const router = useRouter();
  const meetingId = params.meetingId as string;

  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>("PROCESSING");
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [transcriptReady, setTranscriptReady] = useState(false);
  const [artifactStatuses, setArtifactStatuses] = useState<ArtifactStatusItem[]>([
    { type: 'SUMMARY', status: 'IDLE', artifactId: null, errorMessage: null },
    { type: 'MINUTES', status: 'IDLE', artifactId: null, errorMessage: null },
    { type: 'ACTION_ITEMS', status: 'IDLE', artifactId: null, errorMessage: null },
  ]);
  const [allArtifactsComplete, setAllArtifactsComplete] = useState(false);
  const [retryingArtifact, setRetryingArtifact] = useState<ArtifactType | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Handle processing completed (transcript ready) event from WebSocket
  const handleProcessingCompleted = useCallback(() => {
    setProcessingStatus("COMPLETED");
    setTranscriptReady(true);
    // Don't navigate yet - wait for artifacts to complete
  }, []);

  // Handle transcript ready event
  const handleTranscriptReady = useCallback((event: TranscriptReadyEvent) => {
    setTranscriptReady(true);
    setProcessingStatus("COMPLETED");
  }, []);

  // Handle processing failed event from WebSocket
  const handleProcessingFailed = useCallback((event: ProcessingFailedEvent) => {
    setProcessingStatus("FAILED");
    setProcessingError(event.error || "Processing failed");
  }, []);

  // Handle artifact started event
  const handleArtifactStarted = useCallback((event: ArtifactStartedEvent) => {
    setArtifactStatuses(prev => prev.map(a => 
      a.type === event.artifactType 
        ? { ...a, status: 'PENDING', artifactId: event.artifactId }
        : a
    ));
  }, []);

  // Handle artifact completed event
  const handleArtifactCompleted = useCallback((event: ArtifactCompletedEvent) => {
    setArtifactStatuses(prev => prev.map(a => 
      a.type === event.artifactType 
        ? { ...a, status: 'COMPLETED', artifactId: event.artifactId, errorMessage: null }
        : a
    ));
  }, []);

  // Handle artifact failed event
  const handleArtifactFailed = useCallback((event: ArtifactFailedEvent) => {
    setArtifactStatuses(prev => prev.map(a => 
      a.type === event.artifactType 
        ? { ...a, status: 'FAILED', artifactId: event.artifactId, errorMessage: event.error }
        : a
    ));
  }, []);

  // Handle all artifacts completed event
  const handleAllArtifactsCompleted = useCallback((event: AllArtifactsCompletedEvent) => {
    setAllArtifactsComplete(true);
    // Navigate to results page after a short delay
    setTimeout(() => {
      router.push(`/meeting/${meetingId}/results`);
    }, 1500);
  }, [meetingId, router]);

  // WebSocket connection for real-time updates
  useMeetingWebSocket({
    meetingId,
    onProcessingCompleted: handleProcessingCompleted,
    onProcessingFailed: handleProcessingFailed,
    onTranscriptReady: handleTranscriptReady,
    onArtifactStarted: handleArtifactStarted,
    onArtifactCompleted: handleArtifactCompleted,
    onArtifactFailed: handleArtifactFailed,
    onAllArtifactsCompleted: handleAllArtifactsCompleted,
    enabled: !allArtifactsComplete,
  });

  // Poll for processing and artifact status as fallback
  const pollProcessingStatus = useCallback(async () => {
    try {
      // Check transcription status
      const { data, error } = await getMeetingProcessingStatus(meetingId);
      if (error || !data) {
        console.error("Error polling processing status:", error);
        return;
      }

      setProcessingStatus(data.processingStatus);
      
      if (data.processingStatus === "COMPLETED") {
        setTranscriptReady(true);
        
        // Also check artifact status
        const { data: artifactData } = await getArtifactsStatus(meetingId);
        if (artifactData) {
          setArtifactStatuses(artifactData.artifacts.map(a => ({
            type: a.type,
            status: a.status,
            artifactId: a.artifactId,
            errorMessage: a.errorMessage
          })));
          
          if (artifactData.allCompleted) {
            setAllArtifactsComplete(true);
            router.push(`/meeting/${meetingId}/results`);
          }
        }
      } else if (data.processingStatus === "FAILED") {
        setProcessingError(data.processingError || "Processing failed");
      }
    } catch (err) {
      console.error("Error polling processing status:", err);
    }
  }, [meetingId, router]);

  // Handle artifact retry
  const handleRetryArtifact = useCallback(async (type: ArtifactType) => {
    setRetryingArtifact(type);
    try {
      const { data, error } = await retryArtifact(meetingId, type);
      if (error || !data) {
        console.error("Error retrying artifact:", error);
        return;
      }
      
      // Update status to pending
      setArtifactStatuses(prev => prev.map(a => 
        a.type === type 
          ? { ...a, status: 'PENDING', artifactId: data.artifactId, errorMessage: null }
          : a
      ));
    } catch (err) {
      console.error("Error retrying artifact:", err);
    } finally {
      setRetryingArtifact(null);
    }
  }, [meetingId]);

  // Handle retry transcription
  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    setProcessingError(null);
    
    try {
      const { data, error } = await retryMeetingTranscription(meetingId);
      if (error || !data?.success) {
        setProcessingError(error?.message || "Failed to retry transcription");
        setIsRetrying(false);
        return;
      }
      
      // Reset to processing state and start polling again
      setProcessingStatus("PROCESSING");
      setIsRetrying(false);
      
      // Restart polling
      pollingRef.current = setInterval(pollProcessingStatus, 5000);
    } catch (err) {
      console.error("Error retrying transcription:", err);
      setProcessingError("Failed to retry transcription. Please try again.");
      setIsRetrying(false);
    }
  }, [meetingId, pollProcessingStatus]);

  // Initialize and start polling
  useEffect(() => {
    const init = async () => {
      const sessionValid = await ensureGuestSession();
      if (!sessionValid) {
        router.push("/");
        return;
      }

      // Initial check
      await pollProcessingStatus();
      setIsLoading(false);

      // Start polling as fallback (every 5 seconds)
      pollingRef.current = setInterval(pollProcessingStatus, 5000);
    };

    init();

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [pollProcessingStatus, router]);

  // Stop polling when not processing
  useEffect(() => {
    if (processingStatus !== "PROCESSING" && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, [processingStatus]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-primary border-muted rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Helper to get artifact display name
  const getArtifactDisplayName = (type: ArtifactType): string => {
    const names: Record<ArtifactType, string> = {
      SUMMARY: 'Summary',
      MINUTES: 'Minutes',
      ACTION_ITEMS: 'Action Items'
    };
    return names[type];
  };

  // Helper to render status icon
  const renderStatusIcon = (status: ArtifactStatus | 'IDLE') => {
    switch (status) {
      case 'COMPLETED':
        return (
          <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'FAILED':
        return (
          <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      case 'PENDING':
        return (
          <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        );
      default:
        return (
          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-muted-foreground" />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-xl w-full">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-xl">
            {allArtifactsComplete ? 'Processing Complete!' : 'Processing Your Meeting...'}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 pb-8">
          <div className="space-y-6">
            {/* Progress Timeline */}
            <div className="space-y-4">
              {/* Transcript Status */}
              <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                {processingStatus === "PROCESSING" ? (
                  <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                ) : processingStatus === "FAILED" ? (
                  <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-medium">Transcript</p>
                  <p className="text-sm text-muted-foreground">
                    {processingStatus === "PROCESSING" 
                      ? "Transcribing audio..." 
                      : processingStatus === "FAILED"
                      ? processingError || "Failed"
                      : "Complete"}
                  </p>
                </div>
                {processingStatus === "FAILED" && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleRetry}
                    disabled={isRetrying}
                  >
                    {isRetrying ? "Retrying..." : "Retry"}
                  </Button>
                )}
              </div>

              {/* Artifact Statuses */}
              {transcriptReady && artifactStatuses.map((artifact) => (
                <div key={artifact.type} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                  {renderStatusIcon(artifact.status)}
                  <div className="flex-1">
                    <p className="font-medium">{getArtifactDisplayName(artifact.type)}</p>
                    <p className="text-sm text-muted-foreground">
                      {artifact.status === 'IDLE' && "Waiting..."}
                      {artifact.status === 'PENDING' && "Generating..."}
                      {artifact.status === 'COMPLETED' && "Complete"}
                      {artifact.status === 'FAILED' && (artifact.errorMessage || "Failed")}
                    </p>
                  </div>
                  {artifact.status === 'FAILED' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleRetryArtifact(artifact.type)}
                      disabled={retryingArtifact === artifact.type}
                    >
                      {retryingArtifact === artifact.type ? "Retrying..." : "Retry"}
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* All Completed Message */}
            {allArtifactsComplete && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-muted-foreground">Redirecting to your results...</p>
              </div>
            )}

            {/* Info Box */}
            {!allArtifactsComplete && processingStatus !== "FAILED" && (
              <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground text-center">
                <p>This may take a few minutes depending on the recording length.</p>
                <p className="mt-2 font-medium">You can safely leave this page and come back later.</p>
              </div>
            )}

            {/* Navigation Buttons */}
            {(processingStatus === "FAILED" || artifactStatuses.some(a => a.status === 'FAILED')) && (
              <div className="flex gap-3 justify-center">
                <Button 
                  variant="outline"
                  onClick={() => router.push("/create-meeting")}
                >
                  Create New Meeting
                </Button>
                <Button onClick={() => router.push(`/meeting/${meetingId}/results`)}>
                  View Results Anyway
                </Button>
              </div>
            )}

            {/* Idle State */}
            {processingStatus === "IDLE" && !transcriptReady && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-muted-foreground">Waiting for recording to be uploaded...</p>
                <Button 
                  variant="outline"
                  onClick={() => router.push(`/meeting/${meetingId}`)}
                >
                  Return to Meeting
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
