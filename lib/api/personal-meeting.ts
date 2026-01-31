/**
 * Personal Meeting API
 * 
 * API functions for authenticated personal users to manage their meetings
 */

import { api } from '../api';

export type MeetingType = 'INSTANT' | 'SCHEDULED';

export type MeetingStatus = 
  | 'WAITING'
  | 'SCHEDULED'
  | 'LIVE'
  | 'ACTIVE'
  | 'ENDED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED';

export type ProcessingStatus = 'IDLE' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type Participant = {
  name?: string;
  email?: string;
};

export type CreateMeetingRequest = {
  title: string;
  meetingType: MeetingType;
  scheduledAt?: string;
  durationMinutes: number;
  participants?: Participant[];
  location?: string;
};

export type MeetingListItem = {
  id: string;
  title: string;
  meetingType: MeetingType;
  status: MeetingStatus;
  scheduledAt: string | null;
  durationMinutes: number;
  participantCount: number;
  hasArtifacts: boolean;
  createdAt: string;
};

export type MeetingListResponse = {
  meetings: MeetingListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type MeetingParticipant = {
  id: string;
  name: string;
  email: string | null;
  status: string;
  joinedAt: string | null;
};

export type MeetingDetail = {
  id: string;
  title: string;
  description: string | null;
  meetingType: MeetingType;
  status: MeetingStatus;
  processingStatus: ProcessingStatus;
  scheduledAt: string | null;
  durationMinutes: number;
  location: string | null;
  joinUrl: string;
  joinCode: string;
  participants: MeetingParticipant[];
  hasTranscript: boolean;
  hasArtifacts: {
    summary: boolean;
    minutes: boolean;
    actionItems: boolean;
  };
  createdAt: string;
  updatedAt: string;
};

export type InviteResult = {
  email: string;
  success: boolean;
  error?: string;
};

export type CreateMeetingResponse = {
  success: boolean;
  meeting: MeetingDetail;
  inviteResults?: InviteResult[];
};

export type InviteResponse = {
  success: boolean;
  totalSent: number;
  totalFailed: number;
  results: InviteResult[];
};

/**
 * Create a new meeting for authenticated personal user
 */
export async function createPersonalMeeting(
  data: CreateMeetingRequest
): Promise<{ data: CreateMeetingResponse | null; error: Error | null }> {
  try {
    const response = await api.post<CreateMeetingResponse>('/api/personal/meetings', data);
    return { data: response.data, error: null };
  } catch (error: any) {
    console.error('Error creating personal meeting:', error);
    return { 
      data: null, 
      error: new Error(error.response?.data?.error || 'Failed to create meeting') 
    };
  }
}

/**
 * List meetings for authenticated personal user with pagination
 */
export async function listPersonalMeetings(
  page: number = 1,
  pageSize: number = 10
): Promise<{ data: MeetingListResponse | null; error: Error | null }> {
  try {
    const response = await api.get<MeetingListResponse>('/api/personal/meetings', {
      params: { page, pageSize },
    });
    return { data: response.data, error: null };
  } catch (error: any) {
    console.error('Error listing personal meetings:', error);
    return { 
      data: null, 
      error: new Error(error.response?.data?.error || 'Failed to list meetings') 
    };
  }
}

/**
 * Get meeting details by ID
 */
export async function getPersonalMeeting(
  meetingId: string
): Promise<{ data: MeetingDetail | null; error: Error | null }> {
  try {
    const response = await api.get<MeetingDetail>(`/api/personal/meetings/${meetingId}`);
    return { data: response.data, error: null };
  } catch (error: any) {
    console.error('Error getting personal meeting:', error);
    return { 
      data: null, 
      error: new Error(error.response?.data?.error || 'Failed to get meeting') 
    };
  }
}

/**
 * Update a meeting
 */
export async function updatePersonalMeeting(
  meetingId: string,
  updates: Partial<CreateMeetingRequest>
): Promise<{ data: { success: boolean; meeting: MeetingDetail } | null; error: Error | null }> {
  try {
    const response = await api.put<{ success: boolean; meeting: MeetingDetail }>(
      `/api/personal/meetings/${meetingId}`,
      updates
    );
    return { data: response.data, error: null };
  } catch (error: any) {
    console.error('Error updating personal meeting:', error);
    return { 
      data: null, 
      error: new Error(error.response?.data?.error || 'Failed to update meeting') 
    };
  }
}

/**
 * Delete a meeting
 */
export async function deletePersonalMeeting(
  meetingId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    await api.delete(`/api/personal/meetings/${meetingId}`);
    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error deleting personal meeting:', error);
    return { 
      success: false, 
      error: new Error(error.response?.data?.error || 'Failed to delete meeting') 
    };
  }
}

/**
 * Resend invites to participants
 */
export async function resendMeetingInvites(
  meetingId: string,
  participants: Participant[]
): Promise<{ data: InviteResponse | null; error: Error | null }> {
  try {
    const response = await api.post<InviteResponse>(
      `/api/personal/meetings/${meetingId}/invite`,
      { participants }
    );
    return { data: response.data, error: null };
  } catch (error: any) {
    console.error('Error resending invites:', error);
    return { 
      data: null, 
      error: new Error(error.response?.data?.error || 'Failed to resend invites') 
    };
  }
}

/**
 * Format participants array for API request
 */
export function formatParticipants(
  emailsOrNames: string[]
): Participant[] {
  return emailsOrNames.map((value) => {
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    return isEmail ? { email: value } : { name: value };
  });
}

/**
 * Format participants array for API request
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${remainingMinutes} min`;
}

// Meeting stats types
export interface MeetingStats {
  totalMeetings: number;
  totalDurationMinutes: number;
  completedMeetings: number;
  upcomingMeetings: number;
  liveMeetings: number;
}

/**
 * Get meeting statistics for dashboard
 */
export async function getMeetingStats(): Promise<{ data: MeetingStats | null; error: { message: string; status: number } | null }> {
  try {
    const response = await api.get('/api/personal/meetings/stats');
    return { data: response.data.stats, error: null };
  } catch (error: any) {
    return {
      data: null,
      error: {
        message: error.response?.data?.error || 'Failed to fetch meeting statistics',
        status: error.response?.status || 500,
      },
    };
  }
}

/**
 * Format scheduled date and time into ISO string
 */
export function formatScheduledDateTime(date: Date, time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const scheduled = new Date(date);
  scheduled.setHours(hours, minutes, 0, 0);
  return scheduled.toISOString();
}

/**
 * Get status display text
 */
export function getStatusDisplay(status: MeetingStatus): string {
  const statusMap: Record<MeetingStatus, string> = {
    WAITING: 'Waiting',
    SCHEDULED: 'Scheduled',
    LIVE: 'Live',
    ACTIVE: 'Live',
    ENDED: 'Ended',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    FAILED: 'Failed',
  };
  return statusMap[status] || status;
}

/**
 * Get status color class
 */
export function getStatusColor(status: MeetingStatus): string {
  const colorMap: Record<MeetingStatus, string> = {
    WAITING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    SCHEDULED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    LIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    ENDED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
    COMPLETED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
    CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    FAILED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };
  return colorMap[status] || 'bg-gray-100 text-gray-800';
}

export default {
  createPersonalMeeting,
  listPersonalMeetings,
  getPersonalMeeting,
  updatePersonalMeeting,
  deletePersonalMeeting,
  resendMeetingInvites,
  formatParticipants,
  formatScheduledDateTime,
  getStatusDisplay,
  getStatusColor,
};
