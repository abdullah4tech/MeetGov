"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  MeetingArtifact,
  ArtifactType,
  ArtifactStatus,
  getArtifacts,
  generateSummary,
  generateMinutes,
  generateActionItems,
  updateArtifact,
  copyToClipboard,
  downloadAsFile,
} from "@/lib/api/transcript";
import { ActionItemsEditor } from "./ActionItemsEditor";
import { exportArtifactAsPDF, exportAllArtifactsAsPDF } from "@/lib/pdf-export";

type GeneratingState = {
  SUMMARY: boolean;
  MINUTES: boolean;
  ACTION_ITEMS: boolean;
};

type EditingState = {
  [artifactId: string]: string;
};

interface ArtifactsPanelProps {
  meetingId: string;
  initialArtifacts?: MeetingArtifact[];
  onArtifactsChange?: (artifacts: MeetingArtifact[]) => void;
}

export function ArtifactsPanel({
  meetingId,
  initialArtifacts = [],
  onArtifactsChange,
}: ArtifactsPanelProps) {
  const [artifacts, setArtifacts] = useState<MeetingArtifact[]>(initialArtifacts);
  const [generating, setGenerating] = useState<GeneratingState>({
    SUMMARY: false,
    MINUTES: false,
    ACTION_ITEMS: false,
  });
  const [editing, setEditing] = useState<EditingState>({});
  const [savingArtifact, setSavingArtifact] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Load artifacts
  const loadArtifacts = useCallback(async () => {
    try {
      const { data, error: apiError } = await getArtifacts(meetingId);
      if (apiError || !data) {
        console.error("Error loading artifacts:", apiError);
        return [];
      }
      setArtifacts(data.artifacts);
      onArtifactsChange?.(data.artifacts);

      // Update generating state based on pending artifacts
      const pendingTypes = new Set<ArtifactType>();
      data.artifacts.forEach((a) => {
        if (a.status === "PENDING") {
          pendingTypes.add(a.type);
        }
      });

      setGenerating((prev) => ({
        SUMMARY: pendingTypes.has("SUMMARY"),
        MINUTES: pendingTypes.has("MINUTES"),
        ACTION_ITEMS: pendingTypes.has("ACTION_ITEMS"),
      }));

      return data.artifacts;
    } catch (err) {
      console.error("Error loading artifacts:", err);
      return [];
    }
  }, [meetingId, onArtifactsChange]);

  // Poll for artifact updates
  const startPolling = useCallback(() => {
    if (pollingRef.current) return;

    pollingRef.current = setInterval(async () => {
      const arts = await loadArtifacts();

      // Stop polling if no pending artifacts
      const hasPending = arts?.some((a) => a.status === "PENDING");
      if (!hasPending && pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }, 3000);
  }, [loadArtifacts]);

  // Stop polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  // Load artifacts on mount if not provided
  useEffect(() => {
    if (initialArtifacts.length === 0) {
      loadArtifacts();
    }
  }, [initialArtifacts.length, loadArtifacts]);

  // Handle artifact generation
  const handleGenerate = async (type: ArtifactType) => {
    setGenerating((prev) => ({ ...prev, [type]: true }));
    setError(null);

    try {
      let result;
      switch (type) {
        case "SUMMARY":
          result = await generateSummary(meetingId);
          break;
        case "MINUTES":
          result = await generateMinutes(meetingId);
          break;
        case "ACTION_ITEMS":
          result = await generateActionItems(meetingId);
          break;
      }

      if (result.error) {
        setError(`Failed to generate ${type.toLowerCase().replace("_", " ")}`);
        setGenerating((prev) => ({ ...prev, [type]: false }));
        return;
      }

      // Start polling for updates
      await loadArtifacts();
      startPolling();
    } catch (err) {
      console.error("Error generating artifact:", err);
      setError(`Failed to generate ${type.toLowerCase().replace("_", " ")}`);
      setGenerating((prev) => ({ ...prev, [type]: false }));
    }
  };

  // Handle artifact edit
  const handleEditChange = (artifactId: string, content: string) => {
    setEditing((prev) => ({ ...prev, [artifactId]: content }));
  };

  // Handle artifact save
  const handleSaveArtifact = async (artifactId: string) => {
    const content = editing[artifactId];
    if (content === undefined) return;

    setSavingArtifact(artifactId);
    try {
      const { error: apiError } = await updateArtifact(artifactId, content);
      if (apiError) {
        console.error("Error saving artifact:", apiError);
        return;
      }

      // Clear editing state and reload artifacts
      setEditing((prev) => {
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

  // Cancel edit
  const handleCancelEdit = (artifactId: string) => {
    setEditing((prev) => {
      const next = { ...prev };
      delete next[artifactId];
      return next;
    });
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

  // Download artifact as text
  const handleDownloadArtifact = (artifact: MeetingArtifact) => {
    if (!artifact.content) return;
    const typeNames: Record<ArtifactType, string> = {
      SUMMARY: "summary",
      MINUTES: "minutes",
      ACTION_ITEMS: "action-items",
    };
    const filename = `${typeNames[artifact.type]}-${meetingId.slice(0, 8)}.txt`;
    // Strip markdown for plain text export
    const plainText = artifact.content
      .replace(/#{1,6}\s/g, "")
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/`/g, "");
    downloadAsFile(plainText, filename, "text/plain");
  };

  // Download artifact as PDF
  const handleDownloadArtifactPDF = (artifact: MeetingArtifact) => {
    if (!artifact.content) return;
    exportArtifactAsPDF(artifact);
  };

  // Download all artifacts as PDF
  const handleDownloadAllArtifactsPDF = () => {
    const completedArtifacts = artifacts.filter(
      (a) => a.status === "COMPLETED" && a.content
    );
    if (completedArtifacts.length === 0) return;
    exportAllArtifactsAsPDF(completedArtifacts);
  };

  // Get artifact by type
  const getArtifact = (type: ArtifactType): MeetingArtifact | undefined => {
    return artifacts.find((a) => a.type === type);
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
  const renderArtifactSection = (
    type: ArtifactType,
    title: string,
    buttonText: string
  ) => {
    const artifact = getArtifact(type);
    const isGenerating = generating[type] || artifact?.status === "PENDING";
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
            {artifact?.status === "COMPLETED" && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyArtifact(artifact)}
                  className="h-8 w-8 p-0"
                  title="Copy to clipboard"
                >
                  {copySuccess === artifact.id ? (
                    <svg
                      className="w-4 h-4 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownloadArtifact(artifact)}
                  className="h-8 w-8 p-0"
                  title="Download as .txt"
                  aria-label="Download as text file"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownloadArtifactPDF(artifact)}
                  className="h-8 w-8 p-0"
                  title="Download as PDF"
                  aria-label="Download as PDF file"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
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
          ) : artifact?.status === "COMPLETED" ? (
            type === "ACTION_ITEMS" ? (
              <ActionItemsEditor
                artifact={artifact}
                isEditing={!!isEditing}
                editingContent={editing[artifact.id]}
                onEditChange={(content: string) => handleEditChange(artifact.id, content)}
                onSave={() => handleSaveArtifact(artifact.id)}
                onCancel={() => handleCancelEdit(artifact.id)}
                isSaving={isSaving || false}
              />
            ) : (
              <div className="space-y-3">
                <Textarea
                  value={isEditing ? editing[artifact.id] : artifact.content || ""}
                  onChange={(e) => handleEditChange(artifact.id, e.target.value)}
                  onFocus={() => {
                    if (!isEditing && artifact.content) {
                      setEditing((prev) => ({
                        ...prev,
                        [artifact.id]: artifact.content!,
                      }));
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
                      onClick={() => handleCancelEdit(artifact.id)}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSaveArtifact(artifact.id)}
                      disabled={isSaving}
                    >
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                )}
              </div>
            )
          ) : artifact?.status === "FAILED" ? (
            <div className="space-y-3">
              <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                {artifact.errorMessage || "Generation failed. Please try again."}
              </div>
              <Button variant="outline" size="sm" onClick={() => handleGenerate(type)}>
                Retry
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => handleGenerate(type)}
              disabled={isGenerating}
              className="w-full"
            >
              {buttonText}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  // Check if any artifacts are completed for the export all button
  const hasCompletedArtifacts = artifacts.some(
    (a) => a.status === "COMPLETED" && a.content
  );

  return (
    <div className="space-y-4" role="region" aria-label="Meeting Artifacts">
      {error && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm" role="alert">
          {error}
          <Button
            variant="ghost"
            size="sm"
            className="ml-2"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
          >
            Dismiss
          </Button>
        </div>
      )}
      {hasCompletedArtifacts && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadAllArtifactsPDF}
            className="gap-2"
            aria-label="Export all artifacts as PDF"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
            Export All as PDF
          </Button>
        </div>
      )}
      {renderArtifactSection("SUMMARY", "Meeting Summary", "Generate Summary")}
      {renderArtifactSection("MINUTES", "Meeting Minutes", "Generate Minutes")}
      {renderArtifactSection("ACTION_ITEMS", "Action Items", "Generate Action Items")}
    </div>
  );
}
