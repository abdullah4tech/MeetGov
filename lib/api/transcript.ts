/**
 * Transcript & Artifacts API
 * 
 * Handles all transcript and AI artifact API interactions
 */

import { api, handleApiResponse } from '../api';

// Transcript segment type
export type TranscriptSegment = {
  id: string;
  speakerLabel: string;
  text: string;
  startTimeMs: number;
  endTimeMs: number;
  confidence?: number | null;
};

// Transcript response type
export type TranscriptResponse = {
  segments: TranscriptSegment[];
  language?: string;
};

// Artifact types
export type ArtifactType = 'SUMMARY' | 'MINUTES' | 'ACTION_ITEMS';
export type ArtifactStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

// Artifact type
export type MeetingArtifact = {
  id: string;
  meetingId: string;
  type: ArtifactType;
  content: string | null;
  status: ArtifactStatus;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

// Artifacts response type
export type ArtifactsResponse = {
  artifacts: MeetingArtifact[];
};

// Generate artifact response
export type GenerateArtifactResponse = {
  jobId: string;
  artifactId: string;
  status: 'PENDING';
};

/**
 * Get transcript segments for a meeting
 */
export async function getTranscript(meetingId: string) {
  return handleApiResponse<TranscriptResponse>(
    api.get(`/api/v1/meetings/${meetingId}/transcript`)
      .then(response => response.data)
  );
}

/**
 * Get all artifacts for a meeting
 */
export async function getArtifacts(meetingId: string) {
  return handleApiResponse<ArtifactsResponse>(
    api.get(`/api/v1/meetings/${meetingId}/artifacts`)
      .then(response => response.data)
  );
}

/**
 * Generate AI summary
 */
export async function generateSummary(meetingId: string) {
  return handleApiResponse<GenerateArtifactResponse>(
    api.post(`/api/v1/meetings/${meetingId}/ai/summary`)
      .then(response => response.data)
  );
}

/**
 * Generate AI meeting minutes
 */
export async function generateMinutes(meetingId: string) {
  return handleApiResponse<GenerateArtifactResponse>(
    api.post(`/api/v1/meetings/${meetingId}/ai/minutes`)
      .then(response => response.data)
  );
}

/**
 * Generate AI action items
 */
export async function generateActionItems(meetingId: string) {
  return handleApiResponse<GenerateArtifactResponse>(
    api.post(`/api/v1/meetings/${meetingId}/ai/action-items`)
      .then(response => response.data)
  );
}

/**
 * Update artifact content (for user edits)
 */
export async function updateArtifact(artifactId: string, content: string) {
  return handleApiResponse<{ artifact: MeetingArtifact }>(
    api.put(`/api/v1/artifacts/${artifactId}`, { content })
      .then(response => response.data)
  );
}

// Grouped segment type for speaker-aware display
export type GroupedTranscriptSegment = {
  speakerLabel: string;
  startTimeMs: number;
  endTimeMs: number;
  segments: TranscriptSegment[];
};

/**
 * Group consecutive segments by the same speaker
 * This creates a cleaner, more readable transcript display
 */
export function groupSegmentsBySpeaker(segments: TranscriptSegment[]): GroupedTranscriptSegment[] {
  if (segments.length === 0) return [];

  const groups: GroupedTranscriptSegment[] = [];
  let currentGroup: GroupedTranscriptSegment | null = null;

  for (const segment of segments) {
    if (!currentGroup || currentGroup.speakerLabel !== segment.speakerLabel) {
      // Start a new group
      if (currentGroup) {
        groups.push(currentGroup);
      }
      currentGroup = {
        speakerLabel: segment.speakerLabel,
        startTimeMs: segment.startTimeMs,
        endTimeMs: segment.endTimeMs,
        segments: [segment],
      };
    } else {
      // Add to existing group
      currentGroup.segments.push(segment);
      currentGroup.endTimeMs = segment.endTimeMs;
    }
  }

  // Don't forget the last group
  if (currentGroup) {
    groups.push(currentGroup);
  }

  return groups;
}

/**
 * Get display name for speaker label
 * Converts "SPEAKER_A" to "Speaker A" for better readability
 */
export function formatSpeakerLabel(speakerLabel: string): string {
  return speakerLabel
    .replace(/_/g, ' ')
    .replace(/SPEAKER/i, 'Speaker')
    .trim();
}

/**
 * Format milliseconds to HH:MM:SS
 */
export function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format transcript as plain text for download
 */
export function formatTranscriptAsText(segments: TranscriptSegment[]): string {
  return segments.map(seg => {
    const timestamp = formatTimestamp(seg.startTimeMs);
    return `[${timestamp}] ${seg.speakerLabel}: ${seg.text}`;
  }).join('\n\n');
}

/**
 * Format transcript as markdown for download
 */
export function formatTranscriptAsMarkdown(segments: TranscriptSegment[]): string {
  let markdown = '# Meeting Transcript\n\n';
  
  let currentSpeaker = '';
  
  for (const seg of segments) {
    const timestamp = formatTimestamp(seg.startTimeMs);
    
    if (seg.speakerLabel !== currentSpeaker) {
      currentSpeaker = seg.speakerLabel;
      markdown += `\n## ${seg.speakerLabel}\n\n`;
    }
    
    markdown += `**[${timestamp}]** ${seg.text}\n\n`;
  }
  
  return markdown;
}

/**
 * Download content as a file
 */
export function downloadAsFile(content: string, filename: string, mimeType: string = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copy content to clipboard
 */
export async function copyToClipboard(content: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(content);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Export artifact via backend endpoint
 */
export async function exportArtifact(artifactId: string, format: 'txt' | 'md' = 'txt') {
  return handleApiResponse<Blob>(
    api.get(`/api/v1/artifacts/${artifactId}/export`, {
      params: { format },
      responseType: 'blob'
    }).then(response => response.data)
  );
}

/**
 * Generate artifact (unified endpoint)
 */
export async function generateArtifactByType(meetingId: string, type: ArtifactType) {
  return handleApiResponse<GenerateArtifactResponse>(
    api.post(`/api/v1/meetings/${meetingId}/artifacts/generate`, { type })
      .then(response => response.data)
  );
}

// Artifacts status response type
export type ArtifactsStatusResponse = {
  meetingId: string;
  transcriptReady: boolean;
  artifacts: {
    type: ArtifactType;
    status: ArtifactStatus;
    artifactId: string | null;
    hasContent: boolean;
    errorMessage: string | null;
    updatedAt: string | null;
  }[];
  allCompleted: boolean;
  anyFailed: boolean;
};

/**
 * Get artifacts status for polling
 */
export async function getArtifactsStatus(meetingId: string) {
  return handleApiResponse<ArtifactsStatusResponse>(
    api.get(`/api/v1/meetings/${meetingId}/artifacts/status`)
      .then(response => response.data)
  );
}

/**
 * Retry a failed artifact generation
 */
export async function retryArtifact(meetingId: string, type: ArtifactType) {
  return handleApiResponse<GenerateArtifactResponse>(
    api.post(`/api/v1/meetings/${meetingId}/artifacts/${type.toLowerCase()}/retry`)
      .then(response => response.data)
  );
}

/**
 * Generate all artifacts for a meeting
 */
export async function generateAllArtifacts(meetingId: string) {
  return handleApiResponse<{
    success: boolean;
    artifacts: { type: ArtifactType; artifactId: string; jobId: string; status: 'PENDING' }[];
  }>(
    api.post(`/api/v1/meetings/${meetingId}/artifacts/generate-all`)
      .then(response => response.data)
  );
}

// Action item structure for structured editing
export type ActionItem = {
  id: string;
  task: string;
  assignee: string;
  dueDate: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  completed: boolean;
};

/**
 * Parse action items from markdown content
 */
export function parseActionItems(content: string): ActionItem[] {
  const items: ActionItem[] = [];
  const lines = content.split('\n');
  
  let currentItem: Partial<ActionItem> | null = null;
  let itemIndex = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Match numbered items like "1. **Task**: Description"
    const taskMatch = trimmed.match(/^\d+\.\s*\*?\*?Task\*?\*?:\s*(.+)/i);
    if (taskMatch) {
      if (currentItem && currentItem.task) {
        items.push({
          id: `item-${itemIndex++}`,
          task: currentItem.task || '',
          assignee: currentItem.assignee || 'TBD',
          dueDate: currentItem.dueDate || 'TBD',
          priority: currentItem.priority || 'MEDIUM',
          completed: false,
        });
      }
      currentItem = { task: taskMatch[1].trim() };
      continue;
    }
    
    // Match other fields within current item
    if (currentItem) {
      const assigneeMatch = trimmed.match(/^\*?\*?Assigned To\*?\*?:\s*(.+)/i);
      if (assigneeMatch) {
        currentItem.assignee = assigneeMatch[1].trim();
        continue;
      }
      
      const priorityMatch = trimmed.match(/^\*?\*?Priority\*?\*?:\s*(.+)/i);
      if (priorityMatch) {
        const p = priorityMatch[1].toUpperCase();
        currentItem.priority = (p.includes('HIGH') ? 'HIGH' : p.includes('LOW') ? 'LOW' : 'MEDIUM');
        continue;
      }
      
      const deadlineMatch = trimmed.match(/^\*?\*?Deadline\*?\*?:\s*(.+)/i);
      if (deadlineMatch) {
        currentItem.dueDate = deadlineMatch[1].trim();
        continue;
      }
    }
  }
  
  // Push last item
  if (currentItem && currentItem.task) {
    items.push({
      id: `item-${itemIndex}`,
      task: currentItem.task || '',
      assignee: currentItem.assignee || 'TBD',
      dueDate: currentItem.dueDate || 'TBD',
      priority: currentItem.priority || 'MEDIUM',
      completed: false,
    });
  }
  
  return items;
}

/**
 * Serialize action items back to markdown
 */
export function serializeActionItems(items: ActionItem[]): string {
  return items.map((item, idx) => {
    return `${idx + 1}. **Task**: ${item.task}
   - **Assigned To**: ${item.assignee}
   - **Priority**: ${item.priority}
   - **Deadline**: ${item.dueDate}`;
  }).join('\n\n');
}
