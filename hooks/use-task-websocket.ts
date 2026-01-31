'use client';

import { useEffect, useCallback, useRef } from 'react';

export type TaskEventType = 
  | 'task:created'
  | 'task:updated'
  | 'task:deleted'
  | 'task:assigned'
  | 'task:submitted';

export interface TaskEvent {
  type: TaskEventType;
  meetingId: string;
  taskId: string;
  assigneeEmail?: string;
  assigneeName?: string;
  taskTitle?: string;
  task?: {
    id: string;
    title: string;
    status: string;
    assignedToUserId?: string | null;
    createdByUserId?: string | null;
  };
}

interface UseTaskWebSocketOptions {
  meetingId: string;
  userId?: string;
  onTaskCreated?: (event: TaskEvent) => void;
  onTaskUpdated?: (event: TaskEvent) => void;
  onTaskDeleted?: (event: TaskEvent) => void;
  onTaskAssigned?: (event: TaskEvent) => void;
  onTaskSubmitted?: (event: TaskEvent) => void;
  onAnyTaskEvent?: (event: TaskEvent) => void;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/api/v1/ws';

export function useTaskWebSocket({
  meetingId,
  userId,
  onTaskCreated,
  onTaskUpdated,
  onTaskDeleted,
  onTaskAssigned,
  onTaskSubmitted,
  onAnyTaskEvent,
}: UseTaskWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      
      // Check if this is a task event
      if (!data.type?.startsWith('task:')) return;
      
      // Check if this event is for our meeting
      if (data.meetingId !== meetingId) return;

      const taskEvent = data as TaskEvent;

      // Call the appropriate handler
      switch (taskEvent.type) {
        case 'task:created':
          onTaskCreated?.(taskEvent);
          break;
        case 'task:updated':
          onTaskUpdated?.(taskEvent);
          break;
        case 'task:deleted':
          onTaskDeleted?.(taskEvent);
          break;
        case 'task:assigned':
          onTaskAssigned?.(taskEvent);
          break;
        case 'task:submitted':
          onTaskSubmitted?.(taskEvent);
          break;
      }

      // Always call the generic handler
      onAnyTaskEvent?.(taskEvent);
    } catch (err) {
      console.error('[TaskWS] Failed to parse message:', err);
    }
  }, [meetingId, onTaskCreated, onTaskUpdated, onTaskDeleted, onTaskAssigned, onTaskSubmitted, onAnyTaskEvent]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[TaskWS] Connected');
        reconnectAttempts.current = 0;

        // Authenticate if we have a userId
        if (userId) {
          ws.send(JSON.stringify({
            type: 'authenticate',
            userId,
          }));
        }

        // Subscribe to meeting room
        ws.send(JSON.stringify({
          type: 'subscribe',
          channel: 'meeting',
          meetingId,
          role: 'participant',
        }));
      };

      ws.onmessage = handleMessage;

      ws.onclose = (event) => {
        console.log('[TaskWS] Disconnected:', event.code, event.reason);
        
        // Attempt to reconnect if not a clean close
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectAttempts.current++;
          console.log(`[TaskWS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('[TaskWS] Error:', error);
      };
    } catch (err) {
      console.error('[TaskWS] Failed to connect:', err);
    }
  }, [meetingId, userId, handleMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      // Unsubscribe before closing
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'unsubscribe',
          channel: 'meeting',
          meetingId,
        }));
      }
      wsRef.current.close(1000, 'Component unmounting');
      wsRef.current = null;
    }
  }, [meetingId]);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    reconnect: connect,
  };
}
