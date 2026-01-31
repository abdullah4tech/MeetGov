/**
 * Enterprise API
 * 
 * API functions for enterprise operations
 */

import { api } from '../api';

export interface EnterpriseMember {
  name: string;
  email: string;
  role: 'ADMIN' | 'ORGANIZER' | 'ASSIGNEE';
}

export interface OnboardEnterpriseRequest {
  organizationName: string;
  organizationDomain?: string;
  logoUrl?: string;
  members: EnterpriseMember[];
}

export interface OnboardEnterpriseResponse {
  success: boolean;
  enterprise: {
    id: string;
    name: string;
    domain: string | null;
  };
  invitesSent: number;
  members: Array<{
    email: string;
    name: string;
    role: string;
    inviteId: string;
    status: string;
  }>;
}

export interface EnterpriseMemberInfo {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  status: 'ACCEPTED' | 'PENDING';
  joinedAt?: string;
}

export interface EnterpriseInfo {
  id: string;
  name: string;
  domain: string | null;
}

export interface GetMembersResponse {
  enterprise: EnterpriseInfo;
  members: EnterpriseMemberInfo[];
  pendingInvites: Array<{
    id: string;
    email: string;
    role: string;
    status: string;
    createdAt: string;
    expiresAt: string;
  }>;
}

export interface AcceptInviteResponse {
  success: boolean;
  enterprise: {
    id: string;
    name: string;
  };
  role: string;
}

export const onboardEnterprise = async (data: OnboardEnterpriseRequest): Promise<OnboardEnterpriseResponse> => {
  const response = await api.post<OnboardEnterpriseResponse>('/api/enterprise/onboard', data);
  return response.data;
};

export const getEnterpriseMembers = async (): Promise<GetMembersResponse> => {
  const response = await api.get<GetMembersResponse>('/api/enterprise/members');
  return response.data;
};

export const acceptInvite = async (token: string): Promise<AcceptInviteResponse> => {
  const response = await api.post<AcceptInviteResponse>(`/api/enterprise/invites/${token}/accept`);
  return response.data;
};

export const resendInvite = async (inviteId: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.post<{ success: boolean; message: string }>(`/api/enterprise/invites/${inviteId}/resend`);
  return response.data;
};

// Invite a new member
export interface InviteMemberRequest {
  email: string;
  role: 'ORGANIZER' | 'ASSIGNEE';
  name?: string;
}

export interface InviteMemberResponse {
  success: boolean;
  invite: {
    id: string;
    email: string;
    role: string;
    status: string;
    expiresAt: string;
  };
}

export const inviteMember = async (data: InviteMemberRequest): Promise<InviteMemberResponse> => {
  const response = await api.post<InviteMemberResponse>('/api/enterprise/members/invite', data);
  return response.data;
};

// Update member role
export interface UpdateMemberRoleRequest {
  role: 'ORGANIZER' | 'ASSIGNEE';
}

export interface UpdateMemberRoleResponse {
  success: boolean;
  member: {
    id: string;
    userId: string;
    name: string | null;
    email: string;
    role: string;
  };
}

export const updateMemberRole = async (memberId: string, data: UpdateMemberRoleRequest): Promise<UpdateMemberRoleResponse> => {
  const response = await api.patch<UpdateMemberRoleResponse>(`/api/enterprise/members/${memberId}/role`, data);
  return response.data;
};

// Remove member
export const removeMember = async (memberId: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete<{ success: boolean; message: string }>(`/api/enterprise/members/${memberId}`);
  return response.data;
};

// Cancel invite
export const cancelInvite = async (inviteId: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete<{ success: boolean; message: string }>(`/api/enterprise/invites/${inviteId}`);
  return response.data;
};

// Organization Settings
export interface OrganizationSettings {
  id: string;
  name: string;
  domain: string | null;
  createdAt: string;
  updatedAt: string;
  memberCounts: {
    admins: number;
    organizers: number;
    participants: number;
  };
}

export const getOrganizationSettings = async (): Promise<OrganizationSettings> => {
  const response = await api.get<OrganizationSettings>('/api/enterprise/settings');
  return response.data;
};

export interface UpdateOrganizationSettingsRequest {
  name?: string;
  domain?: string | null;
}

export interface UpdateOrganizationSettingsResponse {
  success: boolean;
  organization: {
    id: string;
    name: string;
    domain: string | null;
    updatedAt: string;
  };
}

export const updateOrganizationSettings = async (data: UpdateOrganizationSettingsRequest): Promise<UpdateOrganizationSettingsResponse> => {
  const response = await api.patch<UpdateOrganizationSettingsResponse>('/api/enterprise/settings', data);
  return response.data;
};

export const deleteOrganization = async (): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete<{ success: boolean; message: string }>('/api/enterprise/organization');
  return response.data;
};

// =============================================================================
// ENTERPRISE MEETING API (for ORGANIZER role - recording, transcription, artifacts)
// =============================================================================

export interface EnterpriseMeeting {
  id: string;
  title: string;
  meetingType: 'INSTANT' | 'SCHEDULED';
  status: string;
  processingStatus: string;
  scheduledAt: string | null;
  durationMinutes: number;
  location: string | null;
  joinUrl: string;
  joinCode: string;
  participants: Array<{
    id: string;
    name: string;
    email: string | null;
    status: string;
    joinedAt: string | null;
  }>;
  hasTranscript: boolean;
  hasArtifacts: {
    summary: boolean;
    minutes: boolean;
    actionItems: boolean;
  };
  isOwner: boolean;
  organizerName: string;
  createdAt: string;
  updatedAt: string;
}

export interface EnterpriseMeetingListItem {
  id: string;
  title: string;
  meetingType: 'INSTANT' | 'SCHEDULED';
  status: string;
  scheduledAt: string | null;
  durationMinutes: number;
  participantCount: number;
  hasArtifacts: boolean;
  isOwner: boolean;
  organizerName: string;
  createdAt: string;
}

export interface EnterpriseMeetingListResponse {
  meetings: EnterpriseMeetingListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateEnterpriseMeetingRequest {
  title: string;
  meetingType: 'INSTANT' | 'SCHEDULED';
  scheduledAt?: string;
  durationMinutes: number;
  participants?: Array<{ name?: string; email?: string }>;
  location?: string;
}

export interface CreateEnterpriseMeetingResponse {
  success: boolean;
  meeting: EnterpriseMeeting;
  inviteResults?: Array<{
    email: string;
    success: boolean;
    error?: string;
  }>;
}

export interface EnterpriseMeetingStatsResponse {
  success: boolean;
  stats: {
    totalMeetings: number;
    totalDurationMinutes: number;
    completedMeetings: number;
    upcomingMeetings: number;
    liveMeetings: number;
  };
}

/**
 * Create a new enterprise meeting (ORGANIZER only)
 */
export const createEnterpriseMeeting = async (
  data: CreateEnterpriseMeetingRequest
): Promise<CreateEnterpriseMeetingResponse> => {
  const response = await api.post<CreateEnterpriseMeetingResponse>('/api/enterprise/meetings', data);
  return response.data;
};

/**
 * List enterprise meetings
 */
export const listEnterpriseMeetings = async (
  options?: {
    page?: number;
    pageSize?: number;
    status?: string;
    search?: string;
  }
): Promise<EnterpriseMeetingListResponse> => {
  const params = new URLSearchParams();
  if (options?.page) params.append('page', options.page.toString());
  if (options?.pageSize) params.append('pageSize', options.pageSize.toString());
  if (options?.status) params.append('status', options.status);
  if (options?.search) params.append('search', options.search);
  
  const query = params.toString();
  const url = `/api/enterprise/meetings${query ? `?${query}` : ''}`;
  const response = await api.get<EnterpriseMeetingListResponse>(url);
  return response.data;
};

/**
 * Get enterprise meeting by ID
 */
export const getEnterpriseMeeting = async (meetingId: string): Promise<EnterpriseMeeting> => {
  const response = await api.get<EnterpriseMeeting>(`/api/enterprise/meetings/${meetingId}`);
  return response.data;
};

/**
 * Update enterprise meeting
 */
export const updateEnterpriseMeeting = async (
  meetingId: string,
  data: Partial<CreateEnterpriseMeetingRequest>
): Promise<{ success: boolean; meeting: EnterpriseMeeting }> => {
  const response = await api.put<{ success: boolean; meeting: EnterpriseMeeting }>(
    `/api/enterprise/meetings/${meetingId}`,
    data
  );
  return response.data;
};

/**
 * Delete enterprise meeting
 */
export const deleteEnterpriseMeeting = async (
  meetingId: string
): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete<{ success: boolean; message: string }>(
    `/api/enterprise/meetings/${meetingId}`
  );
  return response.data;
};

/**
 * Get enterprise meeting statistics
 */
export const getEnterpriseMeetingStats = async (): Promise<EnterpriseMeetingStatsResponse> => {
  const response = await api.get<EnterpriseMeetingStatsResponse>('/api/enterprise/meetings/stats');
  return response.data;
};
