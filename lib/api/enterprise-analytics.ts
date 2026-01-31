/**
 * Enterprise Analytics API
 * 
 * API functions for enterprise analytics and dashboard data
 */

import { api } from '../api';

// Analytics Types
export interface OrganizationStats {
  totalMeetings: number;
  totalDurationMinutes: number;
  completedTasks: number;
  pendingTasks: number;
  totalTasks: number;
  totalMembers: number;
  activeMeetingsToday: number;
}

export interface MeetingTimeSeries {
  date: string;
  count: number;
  totalDurationMinutes: number;
}

export interface MeetingStatsByPeriod {
  period: 'week' | 'month';
  startDate: string;
  endDate: string;
  timeSeries: MeetingTimeSeries[];
  summary: {
    totalMeetings: number;
    avgMeetingsPerDay: number;
    totalDurationMinutes: number;
    avgDurationMinutes: number;
  };
}

export interface TaskStatsByStatus {
  pending: number;
  inProgress: number;
  submitted: number;
  completed: number;
  cancelled: number;
  overdue: number;
}

export interface MemberActivity {
  userId: string;
  userName: string | null;
  userEmail: string;
  role: string;
  meetingsOrganized: number;
  tasksCreated: number;
  tasksCompleted: number;
}

export interface RecentActivityItem {
  type: 'meeting' | 'task';
  action: string;
  timestamp: string;
  details: Record<string, any>;
}

// Dashboard Types
export interface UpcomingMeeting {
  id: string;
  title: string;
  description: string | null;
  scheduledStart: string | null;
  status: string;
  isOwner: boolean;
  attendeeCount: number;
}

export interface AssignedTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  dueDate: string | null;
  meetingId: string;
  meetingTitle: string;
  isOverdue: boolean;
  assignedByName: string | null;
}

export interface DashboardActivityItem {
  id: string;
  type: 'meeting_created' | 'meeting_started' | 'meeting_ended' | 'task_assigned' | 'task_completed' | 'task_submitted' | 'member_joined';
  title: string;
  description: string;
  timestamp: string;
  metadata: Record<string, any>;
}

export interface DashboardStats {
  totalMeetings: number;
  totalTasks: number;
  pendingTasks: number;
  completedTasksThisWeek: number;
}

export interface DashboardData {
  upcomingMeetings: UpcomingMeeting[];
  assignedTasks: AssignedTask[];
  recentActivity: DashboardActivityItem[];
  stats: DashboardStats;
}

export interface ParticipantDashboardData {
  assignedTasks: AssignedTask[];
  upcomingMeetings: UpcomingMeeting[];
  recentActivity: DashboardActivityItem[];
}

export type EnterpriseRole = 'ADMIN' | 'ORGANIZER' | 'ASSIGNEE';

export interface DashboardResponse {
  success: boolean;
  role: EnterpriseRole;
  data: DashboardData | ParticipantDashboardData;
}

// Analytics API Functions

/**
 * Get organization-wide statistics summary
 * Requires ADMIN or ORGANIZER role
 */
export const getAnalyticsSummary = async (): Promise<OrganizationStats> => {
  const response = await api.get<{ success: boolean; data: OrganizationStats }>('/api/enterprise/analytics/summary');
  return response.data.data;
};

/**
 * Get meeting statistics by period
 * @param period - 'week' or 'month'
 */
export const getMeetingStats = async (period: 'week' | 'month' = 'week'): Promise<MeetingStatsByPeriod> => {
  const response = await api.get<{ success: boolean; data: MeetingStatsByPeriod }>(
    `/api/enterprise/analytics/meetings?period=${period}`
  );
  return response.data.data;
};

/**
 * Get task statistics by status
 */
export const getTaskStats = async (): Promise<TaskStatsByStatus> => {
  const response = await api.get<{ success: boolean; data: TaskStatsByStatus }>('/api/enterprise/analytics/tasks');
  return response.data.data;
};

/**
 * Get member activity statistics
 * Requires ADMIN role
 */
export const getMemberActivity = async (limit: number = 10): Promise<MemberActivity[]> => {
  const response = await api.get<{ success: boolean; data: MemberActivity[] }>(
    `/api/enterprise/analytics/members?limit=${limit}`
  );
  return response.data.data;
};

/**
 * Get recent activity feed
 */
export const getRecentActivity = async (limit: number = 20): Promise<RecentActivityItem[]> => {
  const response = await api.get<{ success: boolean; data: RecentActivityItem[] }>(
    `/api/enterprise/analytics/activity?limit=${limit}`
  );
  return response.data.data;
};

// Dashboard API Functions

/**
 * Get dashboard data for the authenticated user
 * Data is scoped based on user role
 */
export const getDashboardData = async (): Promise<DashboardResponse> => {
  const response = await api.get<DashboardResponse>('/api/enterprise/dashboard');
  return response.data;
};

/**
 * Get participant-specific dashboard data
 * Only shows assigned tasks and meetings the user is invited to
 */
export const getParticipantDashboard = async (): Promise<DashboardResponse> => {
  const response = await api.get<DashboardResponse>('/api/enterprise/dashboard/participant');
  return response.data;
};

/**
 * Check if the dashboard data indicates admin/organizer role
 */
export const isFullDashboard = (data: DashboardData | ParticipantDashboardData): data is DashboardData => {
  return 'stats' in data;
};

export default {
  getAnalyticsSummary,
  getMeetingStats,
  getTaskStats,
  getMemberActivity,
  getRecentActivity,
  getDashboardData,
  getParticipantDashboard,
  isFullDashboard
};
