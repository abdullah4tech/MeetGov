/**
 * WebSocket hook for real-time meeting updates
 * 
 * Handles connection, authentication, subscription, and attendance events
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { getWorkflowId } from '@/lib/api/guest-session';
import { useSession } from '@/lib/auth-client';

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
const WS_PATH = '/api/v1/ws';

export type AttendeeInfo = {
  name: string;
  email: string | null;
  checkedInAt: string;
};

export type AttendanceEvent = {
  type: 'attendance:checked-in';
  meetingId: string;
  attendee: AttendeeInfo;
  totalCount: number;
};

export type MeetingAutoEndedEvent = {
  type: 'meeting:auto-ended';
  meetingId: string;
};

export type MeetingStateChangedEvent = {
  type: 'meeting:state-changed';
  meetingId: string;
  recordingState?: string;
  status?: string;
};

export type ProcessingCompletedEvent = {
  type: 'processing:completed';
  meetingId: string;
  processingStatus: 'COMPLETED';
};

export type ProcessingFailedEvent = {
  type: 'processing:failed';
  meetingId: string;
  processingStatus: 'FAILED';
  error?: string;
};

export type TranscriptReadyEvent = {
  type: 'transcript:ready';
  meetingId: string;
  segmentCount?: number;
};

export type ArtifactStartedEvent = {
  type: 'artifact:started';
  meetingId: string;
  artifactType: 'SUMMARY' | 'MINUTES' | 'ACTION_ITEMS';
  artifactId: string;
  timestamp: string;
};

export type ArtifactCompletedEvent = {
  type: 'artifact:completed';
  meetingId: string;
  artifactType: 'SUMMARY' | 'MINUTES' | 'ACTION_ITEMS';
  artifactId: string;
  content?: string;
  timestamp: string;
};

export type ArtifactFailedEvent = {
  type: 'artifact:failed';
  meetingId: string;
  artifactType: 'SUMMARY' | 'MINUTES' | 'ACTION_ITEMS';
  artifactId: string;
  error: string;
  timestamp: string;
};

export type AllArtifactsCompletedEvent = {
  type: 'artifact:all-completed';
  meetingId: string;
  timestamp: string;
};

type ConnectionState = 'connecting' | 'connected' | 'authenticated' | 'subscribed' | 'disconnected' | 'error';

type UseMeetingWebSocketOptions = {
  meetingId: string;
  onAttendanceUpdate?: (event: AttendanceEvent) => void;
  onMeetingAutoEnded?: (event: MeetingAutoEndedEvent) => void;
  onMeetingStateChanged?: (event: MeetingStateChangedEvent) => void;
  onProcessingCompleted?: (event: ProcessingCompletedEvent) => void;
  onProcessingFailed?: (event: ProcessingFailedEvent) => void;
  onTranscriptReady?: (event: TranscriptReadyEvent) => void;
  onArtifactStarted?: (event: ArtifactStartedEvent) => void;
  onArtifactCompleted?: (event: ArtifactCompletedEvent) => void;
  onArtifactFailed?: (event: ArtifactFailedEvent) => void;
  onAllArtifactsCompleted?: (event: AllArtifactsCompletedEvent) => void;
  enabled?: boolean;
};

type UseMeetingWebSocketReturn = {
  connectionState: ConnectionState;
  isConnected: boolean;
  isSubscribed: boolean;
  error: string | null;
};

export function useMeetingWebSocket({
  meetingId,
  onAttendanceUpdate,
  onMeetingAutoEnded,
  onMeetingStateChanged,
  onProcessingCompleted,
  onProcessingFailed,
  onTranscriptReady,
  onArtifactStarted,
  onArtifactCompleted,
  onArtifactFailed,
  onAllArtifactsCompleted,
  enabled = true
}: UseMeetingWebSocketOptions): UseMeetingWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // Stable references to callbacks
  const onAttendanceUpdateRef = useRef(onAttendanceUpdate);
  onAttendanceUpdateRef.current = onAttendanceUpdate;
  const onMeetingAutoEndedRef = useRef(onMeetingAutoEnded);
  onMeetingAutoEndedRef.current = onMeetingAutoEnded;
  const onMeetingStateChangedRef = useRef(onMeetingStateChanged);
  onMeetingStateChangedRef.current = onMeetingStateChanged;
  const onProcessingCompletedRef = useRef(onProcessingCompleted);
  onProcessingCompletedRef.current = onProcessingCompleted;
  const onProcessingFailedRef = useRef(onProcessingFailed);
  onProcessingFailedRef.current = onProcessingFailed;
  const onTranscriptReadyRef = useRef(onTranscriptReady);
  onTranscriptReadyRef.current = onTranscriptReady;
  const onArtifactStartedRef = useRef(onArtifactStarted);
  onArtifactStartedRef.current = onArtifactStarted;
  const onArtifactCompletedRef = useRef(onArtifactCompleted);
  onArtifactCompletedRef.current = onArtifactCompleted;
  const onArtifactFailedRef = useRef(onArtifactFailed);
  onArtifactFailedRef.current = onArtifactFailed;
  const onAllArtifactsCompletedRef = useRef(onAllArtifactsCompleted);
  onAllArtifactsCompletedRef.current = onAllArtifactsCompleted;

  // Get authenticated user session
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const connect = useCallback(() => {
    if (!enabled || !meetingId) return;
    
    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const workflowId = getWorkflowId();
    
    // Require either workflowId (guest) or userId (authenticated)
    if (!workflowId && !userId) {
      setError('No session found. Please refresh the page.');
      setConnectionState('error');
      return;
    }

    try {
      const wsUrl = `${WS_BASE_URL}${WS_PATH}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      setConnectionState('connecting');
      setError(null);

      ws.onopen = () => {
        console.log('[WS] Connected');
        setConnectionState('connected');
        reconnectAttemptsRef.current = 0;

        // Authenticate with appropriate identity
        // Guest flow: use workflowId
        // Authenticated flow: use userId
        const authMessage: Record<string, string | undefined> = {
          type: 'authenticate',
        };
        
        if (workflowId) {
          authMessage.workflowId = workflowId;
          authMessage.token = workflowId;
        }
        
        if (userId) {
          authMessage.userId = userId;
        }
        
        console.log('[WS] Authenticating with:', { workflowId: !!workflowId, userId: !!userId });
        ws.send(JSON.stringify(authMessage));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WS] Received:', data.type);

          switch (data.type) {
            case 'connected':
              // Initial connection confirmed
              break;

            case 'authenticated':
              setConnectionState('authenticated');
              // Subscribe to meeting room
              ws.send(JSON.stringify({
                type: 'subscribe',
                channel: 'meeting',
                meetingId
              }));
              break;

            case 'subscribed':
              setConnectionState('subscribed');
              console.log(`[WS] Subscribed to meeting: ${meetingId}`);
              break;

            case 'attendance:checked-in':
              console.log('[WS] Attendance event received:', data);
              if (onAttendanceUpdateRef.current) {
                onAttendanceUpdateRef.current(data as AttendanceEvent);
              }
              break;

            case 'meeting:auto-ended':
              console.log('[WS] Meeting auto-ended event received:', data);
              if (onMeetingAutoEndedRef.current) {
                onMeetingAutoEndedRef.current(data as MeetingAutoEndedEvent);
              }
              break;

            case 'meeting:state-changed':
              console.log('[WS] Meeting state changed event received:', data);
              if (onMeetingStateChangedRef.current) {
                onMeetingStateChangedRef.current(data as MeetingStateChangedEvent);
              }
              break;

            case 'processing:completed':
              console.log('[WS] Processing completed event received:', data);
              if (onProcessingCompletedRef.current) {
                onProcessingCompletedRef.current(data as ProcessingCompletedEvent);
              }
              break;

            case 'processing:failed':
              console.log('[WS] Processing failed event received:', data);
              if (onProcessingFailedRef.current) {
                onProcessingFailedRef.current(data as ProcessingFailedEvent);
              }
              break;

            case 'transcript:ready':
              console.log('[WS] Transcript ready event received:', data);
              if (onTranscriptReadyRef.current) {
                onTranscriptReadyRef.current(data as TranscriptReadyEvent);
              }
              break;

            case 'artifact:started':
              console.log('[WS] Artifact started event received:', data);
              if (onArtifactStartedRef.current) {
                onArtifactStartedRef.current(data as ArtifactStartedEvent);
              }
              break;

            case 'artifact:completed':
              console.log('[WS] Artifact completed event received:', data);
              if (onArtifactCompletedRef.current) {
                onArtifactCompletedRef.current(data as ArtifactCompletedEvent);
              }
              break;

            case 'artifact:failed':
              console.log('[WS] Artifact failed event received:', data);
              if (onArtifactFailedRef.current) {
                onArtifactFailedRef.current(data as ArtifactFailedEvent);
              }
              break;

            case 'artifact:all-completed':
              console.log('[WS] All artifacts completed event received:', data);
              if (onAllArtifactsCompletedRef.current) {
                onAllArtifactsCompletedRef.current(data as AllArtifactsCompletedEvent);
              }
              break;

            case 'error':
              console.error('[WS] Server error:', data.error);
              setError(data.error);
              break;

            default:
              // Ignore other message types
              break;
          }
        } catch (err) {
          console.error('[WS] Error parsing message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('[WS] Connection error:', event);
        setError('WebSocket connection error');
      };

      ws.onclose = (event) => {
        console.log(`[WS] Disconnected: code=${event.code}`);
        setConnectionState('disconnected');
        wsRef.current = null;

        // Attempt reconnection if not intentionally closed
        if (enabled && event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };
    } catch (err) {
      console.error('[WS] Failed to create WebSocket:', err);
      setError('Failed to connect to server');
      setConnectionState('error');
    }
  }, [enabled, meetingId, userId]);

  // Connect on mount and when dependencies change
  useEffect(() => {
    connect();

    return () => {
      // Cleanup on unmount
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        // Send unsubscribe before closing
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'unsubscribe',
            channel: 'meeting',
            meetingId
          }));
        }
        wsRef.current.close(1000, 'Component unmounted');
        wsRef.current = null;
      }
    };
  }, [connect, meetingId]);

  return {
    connectionState,
    isConnected: connectionState !== 'disconnected' && connectionState !== 'error',
    isSubscribed: connectionState === 'subscribed',
    error
  };
}
