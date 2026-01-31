/**
 * Guest Session API Utilities
 * 
 * Handles anonymous guest workflow interactions without exposing authentication concepts
 */

import { api, handleApiResponse } from '../api';

export type GuestWorkflowResponse = {
  guestSessionToken: string;
  workflowId: string;
  expiresAt: string;
  workflowAllowed: boolean;
  guestInfo?: {
    id: string;
    remainingMeetings: number;
  };
} | {
  workflowAllowed: false;
  reason: 'GUEST_WORKFLOW_EXHAUSTED';
};

/**
 * Starts or retrieves a guest workflow session
 * - Creates a guest session if one doesn't exist
 * - Returns existing session if valid
 * - Enforces one meeting per guest policy
 */
export async function initGuestWorkflow() {
  return handleApiResponse<GuestWorkflowResponse>(
    api.post('/api/v1/guest/workflow/start').then(response => response.data)
  );
}

/**
 * Stores a guest token in sessionStorage (not cookies or localStorage)
 * Will be cleared automatically on tab close
 */
export function storeGuestToken(token: string): void {
  try {
    sessionStorage.setItem('guest_session_token', token);
  } catch (error) {
    console.error('Error storing guest token:', error);
  }
}

/**
 * Stores the workflow ID in sessionStorage
 * Will be cleared automatically on tab close
 */
export function storeWorkflowId(workflowId: string): void {
  try {
    sessionStorage.setItem('guest_workflow_id', workflowId);
  } catch (error) {
    console.error('Error storing workflow ID:', error);
  }
}

/**
 * Retrieves the guest token from sessionStorage if it exists
 */
export function getGuestToken(): string | null {
  try {
    return sessionStorage.getItem('guest_session_token');
  } catch (error) {
    console.error('Error retrieving guest token:', error);
    return null;
  }
}

/**
 * Retrieves the workflow ID from sessionStorage if it exists
 */
export function getWorkflowId(): string | null {
  try {
    return sessionStorage.getItem('guest_workflow_id');
  } catch (error) {
    console.error('Error retrieving workflow ID:', error);
    return null;
  }
}

/**
 * Clears the guest token from sessionStorage
 */
export function clearGuestToken(): void {
  try {
    sessionStorage.removeItem('guest_session_token');
  } catch (error) {
    console.error('Error clearing guest token:', error);
  }
}

/**
 * Clears the workflow ID from sessionStorage
 */
export function clearWorkflowId(): void {
  try {
    sessionStorage.removeItem('guest_workflow_id');
  } catch (error) {
    console.error('Error clearing workflow ID:', error);
  }
}

/**
 * Checks if the guest token exists and initializes a session if needed
 * Returns true if a valid session exists or was created
 */
export async function ensureGuestSession(): Promise<boolean> {
  // Check if a token already exists
  const existingToken = getGuestToken();
  
  if (existingToken && getWorkflowId()) {
    return true;
  }
  
  // Create a new session if none exists
  try {
    const { data, error } = await initGuestWorkflow();
    
    if (error || !data) {
      console.error('Failed to initialize guest workflow:', error);
      return false;
    }
    
    // Check if workflow is allowed
    if (!data.workflowAllowed) {
      return false;
    }
    
    // Store the token and workflow ID
    storeGuestToken(data.guestSessionToken);
    storeWorkflowId(data.workflowId);
    return true;
  } catch (err) {
    console.error('Error ensuring guest workflow:', err);
    return false;
  }
}

/**
 * Check if the guest has any remaining meetings
 * TEMPORARILY MODIFIED to always return true to disable meeting limits
 */
export async function canCreateMeeting(): Promise<boolean> {
  try {
    const { data, error } = await initGuestWorkflow();
    
    if (error || !data) {
      return true; // Always allow meetings even on error
    }
    
    // Update the stored token and workflow ID with the latest values
    if (data.workflowAllowed) {
      storeGuestToken(data.guestSessionToken);
      storeWorkflowId(data.workflowId);
    }
    
    // Always return true regardless of remaining meetings
    return true;
  } catch (err) {
    console.error('Error checking if guest can create meeting:', err);
    return true; // Always return true even on error
  }
}
