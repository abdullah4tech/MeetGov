"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { getMeeting, MeetingResponse, getMeetingByAccessCode } from "@/lib/api/meeting";
import { ensureGuestSession } from "@/lib/api/guest-session";
import {
  getTranscript,
  getArtifacts,
  generateSummary,
  generateMinutes,
  generateActionItems,
  updateArtifact,
  formatTranscriptAsText,
  formatTranscriptAsMarkdown,
  downloadAsFile,
  copyToClipboard,
  TranscriptSegment,
  MeetingArtifact,
  ArtifactType,
  ArtifactStatus,
  formatTimestamp,
  groupSegmentsBySpeaker,
  formatSpeakerLabel,
  GroupedTranscriptSegment,
} from "@/lib/api/transcript";
import { ActionItemsEditor } from "@/components/artifacts/ActionItemsEditor";

type GeneratingState = {
  SUMMARY: boolean;
  MINUTES: boolean;
  ACTION_ITEMS: boolean;
};

type EditingState = {
  [artifactId: string]: string;
};

function ResultsRoomContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const meetingId = params.meetingId as string;
  const accessCode = searchParams.get("code");

  const [meeting, setMeeting] = useState<MeetingResponse | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [groupedSegments, setGroupedSegments] = useState<GroupedTranscriptSegment[]>([]);
  const [artifacts, setArtifacts] = useState<MeetingArtifact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState<GeneratingState>({
    SUMMARY: false,
    MINUTES: false,
    ACTION_ITEMS: false,
  });
  const [editing, setEditing] = useState<EditingState>({});
  const [savingArtifact, setSavingArtifact] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  
  // Read-only state for completed workflows
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [workflowCompletedAt, setWorkflowCompletedAt] = useState<string | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradePromptDismissed, setUpgradePromptDismissed] = useState(false);
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Load meeting data
  const loadMeeting = useCallback(async () => {
    try {
      const { data, error: apiError } = await getMeeting(meetingId);
      if (apiError || !data) {
        throw new Error(apiError?.message || "Failed to load meeting");
      }
      setMeeting(data);
    } catch (err) {
      console.error("Error loading meeting:", err);
      setError("Unable to load meeting results.");
    }
  }, [meetingId]);

  // Load transcript
  const loadTranscript = useCallback(async () => {
    try {
      const { data, error: apiError } = await getTranscript(meetingId);
      if (apiError || !data) {
        console.error("Error loading transcript:", apiError);
        return;
      }
      setSegments(data.segments);
      // Group segments by speaker for cleaner display
      setGroupedSegments(groupSegmentsBySpeaker(data.segments));
    } catch (err) {
      console.error("Error loading transcript:", err);
    }
  }, [meetingId]);

  // Load artifacts
  const loadArtifacts = useCallback(async () => {
    try {
      const { data, error: apiError } = await getArtifacts(meetingId);
      if (apiError || !data) {
        console.error("Error loading artifacts:", apiError);
        return;
      }
      setArtifacts(data.artifacts);
      
      // Check if any artifacts just completed
      const pendingTypes = new Set<ArtifactType>();
      data.artifacts.forEach(a => {
        if (a.status === 'PENDING') {
          pendingTypes.add(a.type);
        }
      });
      
      // Update generating state based on pending artifacts
      setGenerating(prev => ({
        SUMMARY: pendingTypes.has('SUMMARY') ? true : prev.SUMMARY && !data.artifacts.find(a => a.type === 'SUMMARY' && a.status !== 'PENDING'),
        MINUTES: pendingTypes.has('MINUTES') ? true : prev.MINUTES && !data.artifacts.find(a => a.type === 'MINUTES' && a.status !== 'PENDING'),
        ACTION_ITEMS: pendingTypes.has('ACTION_ITEMS') ? true : prev.ACTION_ITEMS && !data.artifacts.find(a => a.type === 'ACTION_ITEMS' && a.status !== 'PENDING'),
      }));
      
      return data.artifacts;
    } catch (err) {
      console.error("Error loading artifacts:", err);
      return [];
    }
  }, [meetingId]);

  // Poll for artifact updates
  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    
    pollingRef.current = setInterval(async () => {
      const arts = await loadArtifacts();
      
      // Stop polling if no pending artifacts
      const hasPending = arts?.some(a => a.status === 'PENDING');
      if (!hasPending && pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }, 3000);
  }, [loadArtifacts]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Initialize
  useEffect(() => {
    const init = async () => {
      const sessionValid = await ensureGuestSession();
      if (!sessionValid) {
        router.push("/");
        return;
      }

      // If we have an access code, verify the meeting status and get read-only state
      if (accessCode) {
        const { data: accessData } = await getMeetingByAccessCode(accessCode);
        if (accessData) {
          // Redirect based on status
          if (accessData.processingStatus !== 'COMPLETED') {
            router.push(`/meeting/${meetingId}/processing?code=${accessCode}`);
            return;
          }
          
          // Set read-only state from backend
          setIsReadOnly(accessData.isReadOnly || false);
          setWorkflowCompletedAt(accessData.workflowCompletedAt || null);
          
          // Show upgrade prompt for guests when workflow is complete (and not dismissed)
          if (accessData.isReadOnly && !upgradePromptDismissed) {
            setShowUpgradePrompt(true);
          }
        }
      }

      await Promise.all([loadMeeting(), loadTranscript(), loadArtifacts()]);
      setIsLoading(false);
    };
    init();

    return () => stopPolling();
  }, [loadMeeting, loadTranscript, loadArtifacts, router, meetingId, accessCode, stopPolling]);

  // Handle artifact generation
  const handleGenerate = async (type: ArtifactType) => {
    setGenerating(prev => ({ ...prev, [type]: true }));
    
    try {
      let result;
      switch (type) {
        case 'SUMMARY':
          result = await generateSummary(meetingId);
          break;
        case 'MINUTES':
          result = await generateMinutes(meetingId);
          break;
        case 'ACTION_ITEMS':
          result = await generateActionItems(meetingId);
          break;
      }
      
      if (result.error) {
        console.error("Error generating artifact:", result.error);
        setGenerating(prev => ({ ...prev, [type]: false }));
        return;
      }
      
      // Start polling for updates
      await loadArtifacts();
      startPolling();
    } catch (err) {
      console.error("Error generating artifact:", err);
      setGenerating(prev => ({ ...prev, [type]: false }));
    }
  };

  // Handle artifact edit
  const handleEditChange = (artifactId: string, content: string) => {
    setEditing(prev => ({ ...prev, [artifactId]: content }));
  };

  // Handle artifact save
  const handleSaveArtifact = async (artifactId: string) => {
    const content = editing[artifactId];
    if (!content) return;
    
    setSavingArtifact(artifactId);
    try {
      const { error: apiError } = await updateArtifact(artifactId, content);
      if (apiError) {
        console.error("Error saving artifact:", apiError);
        return;
      }
      
      // Clear editing state and reload artifacts
      setEditing(prev => {
        const next = { ...prev };
        delete next[artifactId];
        return next;
      });
      await loadArtifacts();
    } catch (err) {
      console.error("Error saving artifact:", err);
    } finally {
      setSavingArtifact(null);
    }
  };

  // Copy transcript
  const handleCopyTranscript = async () => {
    const text = formatTranscriptAsText(segments);
    const success = await copyToClipboard(text);
    if (success) {
      setCopySuccess('transcript');
      setTimeout(() => setCopySuccess(null), 2000);
    }
  };

  // Download transcript
  const handleDownloadTranscript = (format: 'txt' | 'md') => {
    const content = format === 'md' 
      ? formatTranscriptAsMarkdown(segments)
      : formatTranscriptAsText(segments);
    const filename = `transcript-${meetingId}.${format}`;
    downloadAsFile(content, filename, format === 'md' ? 'text/markdown' : 'text/plain');
  };

  // Copy artifact
  const handleCopyArtifact = async (artifact: MeetingArtifact) => {
    if (!artifact.content) return;
    const success = await copyToClipboard(artifact.content);
    if (success) {
      setCopySuccess(artifact.id);
      setTimeout(() => setCopySuccess(null), 2000);
    }
  };

  // Download artifact
  const handleDownloadArtifact = (artifact: MeetingArtifact) => {
    if (!artifact.content) return;
    const typeNames: Record<ArtifactType, string> = {
      SUMMARY: 'summary',
      MINUTES: 'minutes',
      ACTION_ITEMS: 'action-items',
    };
    const filename = `${typeNames[artifact.type]}-${meetingId}.md`;
    downloadAsFile(artifact.content, filename, 'text/markdown');
  };

  // Get artifact by type
  const getArtifact = (type: ArtifactType): MeetingArtifact | undefined => {
    return artifacts.find(a => a.type === type);
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: ArtifactStatus }) => {
    const variants: Record<ArtifactStatus, { className: string; label: string }> = {
      PENDING: { className: "bg-amber-500/10 text-amber-600", label: "Processing" },
      COMPLETED: { className: "bg-green-500/10 text-green-600", label: "Completed" },
      FAILED: { className: "bg-red-500/10 text-red-600", label: "Failed" },
    };
    const { className, label } = variants[status];
    return <Badge className={className}>{label}</Badge>;
  };

  // Render artifact section
  const renderArtifactSection = (type: ArtifactType, title: string, buttonText: string) => {
    const artifact = getArtifact(type);
    const isGenerating = generating[type] || artifact?.status === 'PENDING';
    const isEditing = artifact && editing[artifact.id] !== undefined;
    const isSaving = artifact && savingArtifact === artifact.id;
    
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{title}</CardTitle>
              {artifact && <StatusBadge status={artifact.status} />}
            </div>
            {artifact?.status === 'COMPLETED' && (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyArtifact(artifact)}
                  className="h-8 px-2"
                  title="Copy to clipboard"
                >
                  {copySuccess === artifact.id ? (
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownloadArtifact(artifact)}
                  className="h-8 px-2"
                  title="Download as .txt"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isGenerating ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : artifact?.status === 'COMPLETED' ? (
            type === 'ACTION_ITEMS' ? (
              <ActionItemsEditor
                artifact={artifact}
                isEditing={isEditing || false}
                editingContent={editing[artifact.id]}
                onEditChange={(content: string) => handleEditChange(artifact.id, content)}
                onSave={() => handleSaveArtifact(artifact.id)}
                onCancel={() => {
                  setEditing(prev => {
                    const next = { ...prev };
                    delete next[artifact.id];
                    return next;
                  });
                }}
                isSaving={isSaving || false}
              />
            ) : (
              <div className="space-y-3">
                <Textarea
                  value={isEditing ? editing[artifact.id] : artifact.content || ''}
                  onChange={(e) => handleEditChange(artifact.id, e.target.value)}
                  onFocus={() => {
                    if (!isEditing && artifact.content) {
                      setEditing(prev => ({ ...prev, [artifact.id]: artifact.content! }));
                    }
                  }}
                  className="min-h-[150px] font-mono text-sm resize-y"
                  placeholder="No content"
                />
                {isEditing && (
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing(prev => {
                          const next = { ...prev };
                          delete next[artifact.id];
                          return next;
                        });
                      }}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSaveArtifact(artifact.id)}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                )}
              </div>
            )
          ) : artifact?.status === 'FAILED' ? (
            <div className="space-y-3">
              <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                {artifact.errorMessage || 'Generation failed. Please try again.'}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGenerate(type)}
              >
                Retry
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => handleGenerate(type)}
              disabled={isGenerating || isReadOnly}
              className="w-full"
              title={isReadOnly ? "This meeting is read-only" : undefined}
            >
              {buttonText}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-primary border-muted rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="container max-w-md mx-auto py-12 px-4">
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <div className="bg-destructive/10 p-4 rounded-md">
              <p className="text-destructive">{error || "Meeting not found"}</p>
            </div>
            <Button onClick={() => router.push("/create-meeting")}>
              Create New Meeting
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Upgrade Prompt Banner for Guests */}
      {showUpgradePrompt && !upgradePromptDismissed && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-3">
          <div className="container max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <p className="text-sm font-medium">
                Create an account to keep your meetings forever and unlock unlimited features.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="secondary"
                className="bg-white/20 hover:bg-white/30 text-white border-0"
                onClick={() => router.push("/signup")}
              >
                Sign Up Free
              </Button>
              <button
                onClick={() => {
                  setUpgradePromptDismissed(true);
                  setShowUpgradePrompt(false);
                }}
                className="p-1 hover:bg-white/20 rounded"
                aria-label="Dismiss"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="font-semibold text-lg truncate">{meeting.title}</h1>
            {isReadOnly && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-xs">
                Read-Only
              </Badge>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push("/create-meeting")}>
            New Meeting
          </Button>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-4 py-6">
        {/* Desktop: Two-column layout, Mobile: Stacked */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel: Transcript */}
          <div className="space-y-4">
            <Card className="h-fit">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle>Transcript</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyTranscript}
                      className="h-8 px-2"
                      disabled={segments.length === 0}
                    >
                      {copySuccess === 'transcript' ? (
                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownloadTranscript('txt')}
                      className="h-8 px-2"
                      disabled={segments.length === 0}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {segments.length === 0 ? (
                  <div className="bg-muted/50 rounded-lg p-6 text-center text-muted-foreground">
                    <p>No transcript available.</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px] lg:h-[calc(100vh-220px)]">
                    <div className="space-y-6 pr-4">
                      {groupedSegments.map((group, groupIndex) => (
                        <div key={`group-${groupIndex}`} className="space-y-2">
                          {/* Speaker header with badge */}
                          <div className="flex items-center gap-2 sticky top-0 bg-background/95 backdrop-blur-sm py-1 -mx-1 px-1">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                              {group.speakerLabel.replace('SPEAKER_', '').charAt(0)}
                            </div>
                            <span className="font-semibold text-primary text-sm">
                              {formatSpeakerLabel(group.speakerLabel)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatTimestamp(group.startTimeMs)}
                            </span>
                          </div>
                          {/* Grouped segments from same speaker */}
                          <div className="pl-10 space-y-2">
                            {group.segments.map((segment) => (
                              <p key={segment.id} className="text-sm leading-relaxed">
                                {segment.text}
                              </p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel: AI Artifacts */}
          <div className="space-y-4">
            {renderArtifactSection('SUMMARY', 'Meeting Summary', 'Generate Summary')}
            {renderArtifactSection('MINUTES', 'Meeting Minutes', 'Generate Minutes')}
            {renderArtifactSection('ACTION_ITEMS', 'Action Items', 'Generate Action Items')}

            {/* Meeting Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Meeting Details</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground text-xs">Duration</dt>
                    <dd className="font-medium">{meeting.durationMinutes} min</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">Participants</dt>
                    <dd className="font-medium">{meeting.participants?.length || 0}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">Status</dt>
                    <dd className="font-medium capitalize text-green-600">Completed</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">Segments</dt>
                    <dd className="font-medium">{segments.length}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => router.push("/join")}
              >
                Join Another
              </Button>
              <Button 
                className="flex-1"
                onClick={() => router.push("/create-meeting")}
              >
                New Meeting
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ResultsRoomPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading results...</p>
        </div>
      </div>
    }>
      <ResultsRoomContent />
    </Suspense>
  );
}
