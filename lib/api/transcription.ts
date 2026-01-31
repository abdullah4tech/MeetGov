/**
 * Transcription API
 * 
 * Handles manual transcription control (user-initiated)
 * Transcription is NEVER auto-triggered - user must explicitly start it.
 */

import { api, handleApiResponse } from '../api';
import { getWorkflowId } from './guest-session';

// Transcription status response
export type TranscriptionStatusResponse = {
  meetingId: string;
  hasRecording: boolean;
  hasTranscript: boolean;
  transcriptId: string | null;
  segmentCount: number;
  processingStatus: 'IDLE' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  processingError: string | null;
  canStartTranscription: boolean;
};

// Start transcription response
export type StartTranscriptionResponse = {
  success: boolean;
  meetingId: string;
  jobId: string;
  status: 'PROCESSING';
  message: string;
};

// Retry transcription response
export type RetryTranscriptionResponse = {
  success: boolean;
  meetingId: string;
  jobId: string;
  status: 'PROCESSING';
  message: string;
};

/**
 * Get transcription status for a meeting
 * This tells you:
 * - Whether a recording exists
 * - Whether transcription has been started/completed
 * - Whether user can start transcription
 */
export async function getTranscriptionStatus(meetingId: string) {
  return handleApiResponse<TranscriptionStatusResponse>(
    api.get(`/api/v1/meetings/${meetingId}/transcription/status`)
      .then(response => response.data)
  );
}

/**
 * Start transcription for a meeting (USER-INITIATED)
 * 
 * This is the ONLY way to start transcription.
 * It is NEVER auto-triggered when recording ends.
 * 
 * Prerequisites:
 * - Meeting must have a completed recording
 * - Transcription must not already be in progress
 * - Transcript must not already exist
 */
export async function startTranscription(meetingId: string) {
  const workflowId = getWorkflowId();
  return handleApiResponse<StartTranscriptionResponse>(
    api.post(`/api/v1/meetings/${meetingId}/transcription/start`, { workflowId })
      .then(response => response.data)
  );
}

/**
 * Retry failed transcription
 * 
 * Can only be called if previous transcription attempt failed.
 * Clears existing transcript data and starts fresh.
 */
export async function retryTranscription(meetingId: string) {
  const workflowId = getWorkflowId();
  return handleApiResponse<RetryTranscriptionResponse>(
    api.post(`/api/v1/meetings/${meetingId}/transcription/retry`, { workflowId })
      .then(response => response.data)
  );
}

// Access level response type
export type AccessLevelResponse = {
  meetingId: string;
  accessLevel: 'OWNER' | 'ORGANIZER' | 'ADMIN' | 'NONE';
  canModify: boolean;
  canView: boolean;
  isReadOnly: boolean;
  enterpriseRole: 'ADMIN' | 'ORGANIZER' | 'ASSIGNEE' | null;
};

/**
 * Get user's access level for a meeting
 * Used to determine if user has read-only access (admin) or full access
 */
export async function getMeetingAccessLevel(meetingId: string) {
  return handleApiResponse<AccessLevelResponse>(
    api.get(`/api/v1/meetings/${meetingId}/access-level`)
      .then(response => response.data)
  );
}
