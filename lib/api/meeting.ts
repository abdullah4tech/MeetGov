/**
 * Meeting API
 * 
 * Handles all meeting-related API interactions
 */

import { api, handleApiResponse } from '../api';
import { getWorkflowId } from './guest-session';

// Meeting types from backend schema
export type MeetingType = 'INSTANT' | 'SCHEDULED';
export type MeetingStatus = 'WAITING' | 'SCHEDULED' | 'LIVE' | 'ACTIVE' | 'ENDED' | 'COMPLETED' | 'CANCELLED' | 'FAILED';

// Request type for creating a meeting
export type CreateMeetingRequest = {
  title: string;
  meetingType: MeetingType;
  scheduledAt?: string; // ISO string for date and time combined
  durationMinutes: number;
  participants?: Array<{
    name?: string;
    email?: string;
  }>;
  location?: string;
  workflowId?: string; // Guest workflow ID for tracking context
};

// Response type for meeting data
export type MeetingResponse = {
  id: string;
  title: string;
  meetingType: MeetingType;
  scheduledAt?: string; // ISO date
  durationMinutes: number;
  status: MeetingStatus;
  joinUrl: string;
  participants: Array<{
    id: string;
    name?: string;
    email?: string;
    status: 'INVITED' | 'JOINED' | 'LEFT';
    joinedAt?: string;
    leftAt?: string;
  }>;
  createdBy: {
    id: string;
    type: 'GUEST' | 'USER';
  };
  createdAt: string;
  updatedAt: string;
};

/**
 * Create a new meeting
 * Works with both guest and authenticated users
 */
export async function createMeeting(meetingData: CreateMeetingRequest) {
  // Include workflow ID if available for guest users
  const workflowId = getWorkflowId();
  if (workflowId && !meetingData.workflowId) {
    meetingData.workflowId = workflowId;
  }
  
  return handleApiResponse<MeetingResponse>(
    api.post('/api/v1/meetings', meetingData)
      .then(response => response.data)
  );
}

/**
 * Join an existing meeting by ID
 * Returns connection details needed to join
 */
export async function joinMeeting(meetingId: string) {
  // Include workflow ID if available for guest users
  const workflowId = getWorkflowId();
  const payload = workflowId ? { workflowId } : {};
  
  return handleApiResponse<{
    meeting: MeetingResponse;
    connectionToken: string;
  }>(
    api.post(`/api/v1/meetings/${meetingId}/join`, payload)
      .then(response => response.data)
  );
}

/**
 * Get meeting details by ID
 */
export async function getMeeting(meetingId: string) {
  // Include workflow ID as a query parameter if available
  const workflowId = getWorkflowId();
  const params = workflowId ? { workflowId } : {};
  
  return handleApiResponse<MeetingResponse>(
    api.get(`/api/v1/meetings/${meetingId}`, { params })
      .then(response => response.data)
  );
}

/**
 * Format participant inputs to match the API structure
 * @param participants Array of participant names/emails as strings
 * @returns Structured participant objects
 */
export function formatParticipants(participants: string[]): Array<{name?: string; email?: string}> {
  return participants.map(participant => {
    // Check if input looks like an email
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(participant);
    
    return isEmail 
      ? { email: participant } 
      : { name: participant };
  });
}

/**
 * Format date and time inputs into ISO string for the API
 * @param date JavaScript Date object
 * @param time Time string in HH:MM format
 * @returns ISO formatted date string
 */
export function formatScheduledDateTime(date: Date, time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const scheduledDate = new Date(date);
  
  scheduledDate.setHours(hours, minutes, 0, 0);
  return scheduledDate.toISOString();
}

// Recording state from backend
export type RecordingState = 'NOT_STARTED' | 'RECORDING' | 'PAUSED' | 'STOPPED';

// Meeting lifecycle response
export type MeetingLifecycleResponse = {
  success: boolean;
  meetingId: string;
  status: MeetingStatus;
  recordingState: RecordingState;
  startedAt: string | null;
  endsAt: string | null;
  error?: string;
};

// Meeting state response
export type MeetingStateResponse = {
  status: MeetingStatus;
  recordingState: RecordingState;
  startedAt: string | null;
  endsAt: string | null;
  durationMinutes: number;
};

/**
 * Get current meeting state from backend
 */
export async function getMeetingState(meetingId: string) {
  return handleApiResponse<MeetingStateResponse>(
    api.get(`/api/v1/meetings/${meetingId}/state`)
      .then(response => response.data)
  );
}

/**
 * Start meeting recording
 */
export async function startMeetingRecording(meetingId: string) {
  const workflowId = getWorkflowId();
  return handleApiResponse<MeetingLifecycleResponse>(
    api.post(`/api/v1/meetings/${meetingId}/start`, { workflowId })
      .then(response => response.data)
  );
}

/**
 * Pause meeting recording
 */
export async function pauseMeetingRecording(meetingId: string) {
  const workflowId = getWorkflowId();
  return handleApiResponse<MeetingLifecycleResponse>(
    api.post(`/api/v1/meetings/${meetingId}/pause`, { workflowId })
      .then(response => response.data)
  );
}

/**
 * Resume meeting recording
 */
export async function resumeMeetingRecording(meetingId: string) {
  const workflowId = getWorkflowId();
  return handleApiResponse<MeetingLifecycleResponse>(
    api.post(`/api/v1/meetings/${meetingId}/resume`, { workflowId })
      .then(response => response.data)
  );
}

/**
 * End meeting
 */
export async function endMeetingRecording(meetingId: string) {
  const workflowId = getWorkflowId();
  return handleApiResponse<MeetingLifecycleResponse>(
    api.post(`/api/v1/meetings/${meetingId}/end`, { workflowId })
      .then(response => response.data)
  );
}

// Processing status type
export type ProcessingStatus = 'IDLE' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

// Access code resolution response
export type AccessCodeResponse = {
  id: string;
  title: string;
  status: MeetingStatus;
  processingStatus: ProcessingStatus;
  processingError?: string;
  recordingStatus: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  durationMinutes: number;
  accessCode: string;
  workflowCompletedAt?: string | null;
  isReadOnly: boolean;
};

// Processing status response
export type ProcessingStatusResponse = {
  meetingId: string;
  status: MeetingStatus;
  processingStatus: ProcessingStatus;
  processingError?: string;
};

/**
 * Resolve meeting by access code
 * This is the single source of truth for frontend routing
 */
export async function getMeetingByAccessCode(accessCode: string) {
  return handleApiResponse<AccessCodeResponse>(
    api.get(`/api/v1/meetings/access/${accessCode}`)
      .then(response => response.data)
  );
}

/**
 * Get meeting processing status (for polling)
 */
export async function getMeetingProcessingStatus(meetingId: string) {
  return handleApiResponse<ProcessingStatusResponse>(
    api.get(`/api/v1/meetings/${meetingId}/processing-status`)
      .then(response => response.data)
  );
}

// Send invites response type
export type SendInvitesResponse = {
  success: boolean;
  totalSent: number;
  totalFailed: number;
  results: Array<{
    email: string;
    success: boolean;
    error: string | null;
  }>;
};

/**
 * Send participant invite emails for a meeting
 */
export async function sendMeetingInvites(
  meetingId: string, 
  participants: Array<{ email: string; name?: string }>
) {
  return handleApiResponse<SendInvitesResponse>(
    api.post(`/api/v1/meetings/${meetingId}/send-invites`, { participants })
      .then(response => response.data)
  );
}

// Retry transcription response type
export type RetryTranscriptionResponse = {
  success: boolean;
  meetingId: string;
  jobId: string;
  message: string;
};

/**
 * Retry failed transcription for a meeting
 */
export async function retryMeetingTranscription(meetingId: string) {
  return handleApiResponse<RetryTranscriptionResponse>(
    api.post(`/api/v1/meetings/${meetingId}/retry-transcription`)
      .then(response => response.data)
  );
}
