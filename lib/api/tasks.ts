/**
 * Task API Client
 * 
 * API client for task management and collaboration workflow
 */

import { api } from '../api';

// Types
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Task {
  id: string;
  meetingId: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  createdByUserId?: string | null;
  assignedToUserId?: string | null;
  assignee?: string | null;
  assigneeEmail?: string | null;
  createdByUser?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  assignedToUser?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  submissions?: TaskSubmission[];
  meeting?: {
    id: string;
    title: string;
  };
}

export interface TaskSubmission {
  id: string;
  taskId: string;
  notes?: string | null;
  submittedByUserId?: string | null;
  submittedByEmail?: string | null;
  createdAt: string;
  files: TaskSubmissionFile[];
}

export interface TaskSubmissionFile {
  id: string;
  objectName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  originalFileName?: string | null;
  downloadUrl?: string | null;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  assignedToUserId?: string;
  assigneeEmail?: string;
  assigneeName?: string;
  dueDate?: string;
  priority?: TaskPriority;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  assignedToUserId?: string;
  assigneeEmail?: string;
  assigneeName?: string;
  dueDate?: string;
  priority?: TaskPriority;
}

export interface TaskListFilters {
  status?: TaskStatus;
  assignedToMe?: boolean;
  createdByMe?: boolean;
}

export interface MeetingParticipant {
  id: string;
  name: string | null;
  email: string;
}

// API Functions

/**
 * Create a new task for a meeting
 */
export async function createTask(meetingId: string, input: CreateTaskInput): Promise<Task> {
  const response = await api.post(`/api/meetings/${meetingId}/tasks`, input);
  return response.data.task;
}

/**
 * List tasks for a meeting
 */
export async function listMeetingTasks(meetingId: string, filters?: TaskListFilters): Promise<Task[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.assignedToMe) params.append('assignedToMe', 'true');
  if (filters?.createdByMe) params.append('createdByMe', 'true');
  
  const queryString = params.toString();
  const url = `/api/meetings/${meetingId}/tasks${queryString ? `?${queryString}` : ''}`;
  
  const response = await api.get(url);
  return response.data.tasks;
}

/**
 * Get a single task by ID
 */
export async function getTask(taskId: string): Promise<Task> {
  const response = await api.get(`/api/tasks/${taskId}`);
  return response.data.task;
}

/**
 * Update a task
 */
export async function updateTask(taskId: string, input: UpdateTaskInput): Promise<Task> {
  const response = await api.patch(`/api/tasks/${taskId}`, input);
  return response.data.task;
}

/**
 * Delete a task
 */
export async function deleteTask(taskId: string): Promise<void> {
  await api.delete(`/api/tasks/${taskId}`);
}

/**
 * Get all tasks for the current user (dashboard view)
 */
export async function getMyTasks(filters?: { status?: TaskStatus; limit?: number }): Promise<Task[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.limit) params.append('limit', filters.limit.toString());
  
  const queryString = params.toString();
  const url = `/api/tasks/my-tasks${queryString ? `?${queryString}` : ''}`;
  
  const response = await api.get(url);
  return response.data.tasks;
}

/**
 * Get meeting participants for task assignment
 */
export async function getMeetingParticipants(meetingId: string): Promise<MeetingParticipant[]> {
  const response = await api.get(`/api/meetings/${meetingId}/tasks/participants`);
  return response.data.participants;
}

/**
 * Get presigned upload URL for file submission
 */
export async function getSubmissionUploadUrl(
  taskId: string,
  fileName: string,
  contentType: string,
  fileSize: number
): Promise<{ uploadUrl: string; objectName: string; expiresAt: string }> {
  const response = await api.post(`/api/tasks/${taskId}/upload-url`, {
    fileName,
    contentType,
    fileSize,
  });
  return response.data;
}

/**
 * Create a task submission
 */
export async function createSubmission(
  taskId: string,
  notes?: string,
  files?: Array<{
    objectName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
    originalFileName: string;
  }>
): Promise<TaskSubmission> {
  const response = await api.post(`/api/tasks/${taskId}/submissions`, {
    notes,
    files,
  });
  return response.data.submission;
}

/**
 * List submissions for a task
 */
export async function listSubmissions(taskId: string): Promise<TaskSubmission[]> {
  const response = await api.get(`/api/tasks/${taskId}/submissions`);
  return response.data.submissions;
}

/**
 * Upload file to R2 using presigned URL
 */
export async function uploadFileToR2(
  uploadUrl: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });
    
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });
    
    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'));
    });
    
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}

/**
 * Helper to upload a file and create submission
 */
export async function uploadAndSubmit(
  taskId: string,
  file: File,
  notes?: string,
  onProgress?: (progress: number) => void
): Promise<TaskSubmission> {
  // Get presigned upload URL
  const { uploadUrl, objectName } = await getSubmissionUploadUrl(
    taskId,
    file.name,
    file.type,
    file.size
  );
  
  // Upload file to R2
  await uploadFileToR2(uploadUrl, file, onProgress);
  
  // Create submission record
  const fileUrl = objectName; // The backend will generate the actual URL
  const submission = await createSubmission(taskId, notes, [
    {
      objectName,
      fileUrl,
      fileSize: file.size,
      mimeType: file.type,
      originalFileName: file.name,
    },
  ]);
  
  return submission;
}

// Status helpers
export const taskStatusLabels: Record<TaskStatus, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  SUBMITTED: 'Submitted',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const taskStatusColors: Record<TaskStatus, string> = {
  PENDING: 'bg-gray-100 text-gray-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  SUBMITTED: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export const taskPriorityLabels: Record<TaskPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
};

export const taskPriorityColors: Record<TaskPriority, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-orange-100 text-orange-700',
  HIGH: 'bg-red-100 text-red-700',
};

// Stats types
export interface TaskStats {
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  total: number;
}

/**
 * Get task statistics for dashboard
 */
export async function getTaskStats(): Promise<TaskStats> {
  const response = await api.get('/api/tasks/stats');
  return response.data.stats;
}
