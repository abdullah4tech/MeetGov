/**
 * Attendance API
 * 
 * Handles attendance-related API interactions
 */

import { api, handleApiResponse } from '../api';

export type AttendeeInfo = {
  id: string;
  name: string;
  email: string | null;
  checkedInAt: string | null;
};

export type AttendanceResponse = {
  totalCount: number;
  attendees: AttendeeInfo[];
};

/**
 * Get attendance list for a meeting (initial load)
 */
export async function getAttendance(meetingId: string) {
  return handleApiResponse<AttendanceResponse>(
    api.get(`/api/v1/meetings/${meetingId}/attendance`)
      .then(response => response.data)
  );
}

/**
 * Check in to a meeting (public, no auth required)
 */
export async function checkIn(meetingId: string, name: string, email?: string) {
  return handleApiResponse<{
    success: boolean;
    message: string;
    attendance: {
      id: string;
      name: string;
      email: string | null;
      checkedInAt: string;
    };
    totalCount: number;
  }>(
    api.post('/api/v1/attendance/check-in', {
      meetingId,
      name,
      email: email || undefined
    }).then(response => response.data)
  );
}
