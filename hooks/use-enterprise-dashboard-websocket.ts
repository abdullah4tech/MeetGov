/**
 * Enterprise Dashboard WebSocket Hook
 * 
 * Provides real-time updates for enterprise dashboard using WebSocket
 * Handles task assignments, meeting updates, and notifications
 */

'use client';

import { useEffect, useCallback, useRef, useState } from 'react';

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
const WS_PATH = '/api/v1/ws';

export type EnterpriseRole = 'ADMIN' | 'ORGANIZER' | 'ASSIGNEE';

export interface EnterpriseNotification {
  id: string;
  type: 'task' | 'meeting' | 'member' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: {
    meetingId?: string;
    taskId?: string;
    userId?: string;
  };
}

// Event Types
export type EnterpriseTaskEventType = 
  | 'enterprise:task:assigned'
  | 'enterprise:task:updated'
  | 'enterprise:task:completed';

export type EnterpriseMeetingEventType = 
  | 'enterprise:meeting:created'
  | 'enterprise:meeting:updated'
  | 'enterprise:meeting:started'
  | 'enterprise:meeting:ended';

export type EnterpriseMemberEventType =
  | 'enterprise:member:joined'
  | 'enterprise:member:updated';

export interface EnterpriseTaskEvent {
  type: EnterpriseTaskEventType;
  enterpriseId: string;
  taskId: string;
  meetingId: string;
  taskTitle: string;
  assigneeUserId?: string;
  assigneeName?: string;
  createdByUserId?: string;
  timestamp: string;
}

export interface EnterpriseMeetingEvent {
  type: EnterpriseMeetingEventType;
  enterpriseId: string;
  meetingId: string;
  meetingTitle: string;
  status?: string;
  organizerUserId?: string;
  timestamp: string;
}

export interface EnterpriseMemberEvent {
  type: EnterpriseMemberEventType;
  enterpriseId: string;
  userId: string;
  userName?: string;
  role: string;
  timestamp: string;
}

export interface EnterpriseNotificationEvent {
  type: 'enterprise:notification';
  enterpriseId: string;
  notification: {
    id: string;
    title: string;
    message: string;
    category: 'task' | 'meeting' | 'system';
    actionUrl?: string;
  };
  timestamp: string;
}

type EnterpriseEvent = EnterpriseTaskEvent | EnterpriseMeetingEvent | EnterpriseMemberEvent | EnterpriseNotificationEvent;

interface UseEnterpriseDashboardWebSocketOptions {
  userId?: string;
  enterpriseId?: string;
  enterpriseRole?: EnterpriseRole;
  onTaskEvent?: (event: EnterpriseTaskEvent) => void;
  onMeetingEvent?: (event: EnterpriseMeetingEvent) => void;
  onMemberEvent?: (event: EnterpriseMemberEvent) => void;
  onNotification?: (notification: EnterpriseNotification) => void;
  enabled?: boolean;
}

interface UseEnterpriseDashboardWebSocketReturn {
  notifications: EnterpriseNotification[];
  unreadCount: number;
  isConnected: boolean;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

export function useEnterpriseDashboardWebSocket({
  userId,
  enterpriseId,
  enterpriseRole,
  onTaskEvent,
  onMeetingEvent,
  onMemberEvent,
  onNotification,
  enabled = true,
}: UseEnterpriseDashboardWebSocketOptions): UseEnterpriseDashboardWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  
  const [notifications, setNotifications] = useState<EnterpriseNotification[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Stable refs for callbacks
  const onTaskEventRef = useRef(onTaskEvent);
  onTaskEventRef.current = onTaskEvent;
  const onMeetingEventRef = useRef(onMeetingEvent);
  onMeetingEventRef.current = onMeetingEvent;
  const onMemberEventRef = useRef(onMemberEvent);
  onMemberEventRef.current = onMemberEvent;
  const onNotificationRef = useRef(onNotification);
  onNotificationRef.current = onNotification;

  const addNotification = useCallback((notification: Omit<EnterpriseNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: EnterpriseNotification = {
      ...notification,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false,
    };
    
    setNotifications(prev => [newNotification, ...prev].slice(0, 50));
    onNotificationRef.current?.(newNotification);
  }, []);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data) as EnterpriseEvent;
      
      // Handle enterprise task events
      if (data.type?.startsWith('enterprise:task:')) {
        const taskEvent = data as EnterpriseTaskEvent;
        onTaskEventRef.current?.(taskEvent);

        // Create notification
        let title = '';
        let message = '';
        
        switch (taskEvent.type) {
          case 'enterprise:task:assigned':
            title = 'New Task Assignment';
            message = `You have been assigned "${taskEvent.taskTitle}"`;
            break;
          case 'enterprise:task:updated':
            title = 'Task Updated';
            message = `Task "${taskEvent.taskTitle}" has been updated`;
            break;
          case 'enterprise:task:completed':
            title = 'Task Completed';
            message = `Task "${taskEvent.taskTitle}" has been marked complete`;
            break;
        }

        if (title) {
          addNotification({
            type: 'task',
            title,
            message,
            data: {
              meetingId: taskEvent.meetingId,
              taskId: taskEvent.taskId,
            },
          });
        }
        return;
      }

      // Handle enterprise meeting events
      if (data.type?.startsWith('enterprise:meeting:')) {
        const meetingEvent = data as EnterpriseMeetingEvent;
        onMeetingEventRef.current?.(meetingEvent);

        let title = '';
        let message = '';
        
        switch (meetingEvent.type) {
          case 'enterprise:meeting:created':
            title = 'New Meeting';
            message = `Meeting "${meetingEvent.meetingTitle}" has been created`;
            break;
          case 'enterprise:meeting:started':
            title = 'Meeting Started';
            message = `"${meetingEvent.meetingTitle}" is now live`;
            break;
          case 'enterprise:meeting:ended':
            title = 'Meeting Ended';
            message = `"${meetingEvent.meetingTitle}" has ended`;
            break;
          case 'enterprise:meeting:updated':
            title = 'Meeting Updated';
            message = `"${meetingEvent.meetingTitle}" has been updated`;
            break;
        }

        if (title) {
          addNotification({
            type: 'meeting',
            title,
            message,
            data: {
              meetingId: meetingEvent.meetingId,
            },
          });
        }
        return;
      }

      // Handle enterprise member events
      if (data.type?.startsWith('enterprise:member:')) {
        const memberEvent = data as EnterpriseMemberEvent;
        onMemberEventRef.current?.(memberEvent);

        if (memberEvent.type === 'enterprise:member:joined') {
          addNotification({
            type: 'member',
            title: 'New Team Member',
            message: `${memberEvent.userName || 'A new member'} has joined the organization`,
            data: {
              userId: memberEvent.userId,
            },
          });
        }
        return;
      }

      // Handle direct notifications
      if (data.type === 'enterprise:notification') {
        const notifEvent = data as EnterpriseNotificationEvent;
        addNotification({
          type: notifEvent.notification.category === 'task' ? 'task' : 
                notifEvent.notification.category === 'meeting' ? 'meeting' : 'system',
          title: notifEvent.notification.title,
          message: notifEvent.notification.message,
        });
        return;
      }
    } catch (err) {
      console.error('[EnterpriseWS] Failed to parse message:', err);
    }
  }, [addNotification]);

  const connect = useCallback(() => {
    if (!enabled || !userId || !enterpriseId) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const wsUrl = `${WS_BASE_URL}${WS_PATH}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[EnterpriseWS] Connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;

        // Authenticate with enterprise context
        ws.send(JSON.stringify({
          type: 'authenticate',
          userId,
          enterpriseId,
          enterpriseRole,
          token: enterpriseId,
        }));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'authenticated') {
          console.log('[EnterpriseWS] Authenticated for enterprise:', data.enterpriseId);
        } else if (data.type === 'connected') {
          console.log('[EnterpriseWS] Connection confirmed');
        } else {
          handleMessage(event);
        }
      };

      ws.onclose = (closeEvent) => {
        console.log('[EnterpriseWS] Disconnected:', closeEvent.code);
        setIsConnected(false);
        wsRef.current = null;
        
        // Attempt to reconnect
        if (enabled && closeEvent.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectAttempts.current++;
          console.log(`[EnterpriseWS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('[EnterpriseWS] Error:', error);
      };
    } catch (err) {
      console.error('[EnterpriseWS] Failed to connect:', err);
    }
  }, [enabled, userId, enterpriseId, enterpriseRole, handleMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Component unmounting');
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (enabled && userId && enterpriseId) {
      connect();
    }
    return () => disconnect();
  }, [enabled, userId, enterpriseId, connect, disconnect]);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  };
}

export default useEnterpriseDashboardWebSocket;
