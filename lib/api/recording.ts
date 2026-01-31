/**
 * Recording API
 * 
 * Handles audio recording upload workflow
 */

import { api, handleApiResponse } from '../api';
import { getWorkflowId } from './guest-session';

// Upload response (new combined endpoint)
export type UploadRecordingResponse = {
  success: boolean;
  recordingId: string;
  recordingUrl: string;
  status: string;
  processingStatus: string;
  transcriptionJobId?: string;
  message: string;
};

// Legacy types (kept for backwards compatibility)
export type UploadUrlResponse = {
  uploadUrl: string;
  recordingId: string;
  objectName: string;
  expiresAt: string;
};

export type ConfirmUploadResponse = {
  success: boolean;
  recordingId: string;
  recordingUrl?: string;
  status: string;
  processingStatus: string;
  message: string;
};

/**
 * Upload recording directly through backend (avoids CORS issues with R2)
 * This is the preferred method - uploads file to backend which proxies to R2
 */
export async function uploadRecording(
  meetingId: string,
  blob: Blob
): Promise<{ data?: UploadRecordingResponse; error?: { message: string } }> {
  try {
    const formData = new FormData();
    formData.append('audio', blob, 'recording.webm');
    formData.append('meetingId', meetingId);

    const response = await api.post('/api/v1/recordings/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return { data: response.data };
  } catch (error: unknown) {
    console.error('Error uploading recording:', error);
    const message = error instanceof Error ? error.message : 'Upload failed';
    return { error: { message } };
  }
}

/**
 * Get a presigned URL for uploading a recording (legacy - not recommended due to CORS)
 */
export async function getRecordingUploadUrl(
  meetingId: string,
  mimeType: string,
  fileSize: number
) {
  const workflowId = getWorkflowId();
  return handleApiResponse<UploadUrlResponse>(
    api.post('/api/v1/recordings/upload-url', { 
      meetingId, 
      mimeType, 
      fileSize,
      workflowId 
    }).then(response => response.data)
  );
}

/**
 * Confirm a recording upload and trigger processing (legacy)
 */
export async function confirmRecordingUpload(
  recordingId: string,
  fileSize: number
) {
  const workflowId = getWorkflowId();
  return handleApiResponse<ConfirmUploadResponse>(
    api.post('/api/v1/recordings/confirm', { 
      recordingId, 
      fileSize,
      workflowId 
    }).then(response => response.data)
  );
}

/**
 * Upload audio blob to presigned URL (legacy - not recommended due to CORS)
 */
export async function uploadRecordingBlob(
  uploadUrl: string,
  blob: Blob
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': blob.type,
      },
      body: blob,
    });

    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error uploading recording:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Upload failed' 
    };
  }
}
