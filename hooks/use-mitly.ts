/**
 * MITLY WebSocket Hook
 * 
 * Custom React hook for connecting to MITLY AI assistant
 * - Authenticated WebSocket connection
 * - Real-time streaming responses
 * - Automatic reconnection
 * - Message handling
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export type MitlyMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
};

type MitlyConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export function useMitly() {
  const [status, setStatus] = useState<MitlyConnectionStatus>('disconnected');
  const [messages, setMessages] = useState<MitlyMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const streamingMessageIdRef = useRef<string | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setStatus('connecting');

    try {
      // WebSocket will use cookies for authentication (BetterAuth session cookies)
      // Construct WebSocket URL
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = process.env.NEXT_PUBLIC_API_URL?.replace(/^https?:\/\//, '') || 'localhost:3001';
      const wsUrl = `${wsProtocol}//${wsHost}/ws/mitly`;

      console.log('[MITLY] Connecting to:', wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[MITLY] Connected');
        setStatus('connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleMessage(data);
        } catch (error) {
          console.error('[MITLY] Failed to parse message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[MITLY] WebSocket error:', error);
        setStatus('error');
      };

      ws.onclose = (event) => {
        console.log('[MITLY] Disconnected:', event.code, event.reason);
        setStatus('disconnected');
        wsRef.current = null;

        // Attempt reconnection after 3 seconds
        if (event.code !== 1000 && event.code !== 1008) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('[MITLY] Attempting reconnection...');
            connect();
          }, 3000);
        }
      };
    } catch (error) {
      console.error('[MITLY] Connection error:', error);
      setStatus('error');
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    
    setStatus('disconnected');
  }, []);

  const handleMessage = useCallback((data: any) => {
    console.log('[MITLY] Received:', data.type);

    switch (data.type) {
      case 'mitly:ready':
        console.log('[MITLY] Ready:', data.user);
        // Add welcome message
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: `Hello${data.user?.name ? `, ${data.user.name.split(' ')[0]}` : ''}! I'm MITLY, your AI assistant. I can help you with questions about your meetings, tasks, and dashboard data. What would you like to know?`,
          timestamp: new Date(),
        }]);
        break;

      case 'mitly:chunk':
        // Stream content chunk
        if (streamingMessageIdRef.current) {
          setMessages((prev) => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            if (lastMsg && lastMsg.id === streamingMessageIdRef.current) {
              lastMsg.content += data.content;
            }
            return updated;
          });
        } else {
          // Start new streaming message
          const messageId = `assistant-${Date.now()}`;
          streamingMessageIdRef.current = messageId;
          setMessages((prev) => [
            ...prev,
            {
              id: messageId,
              role: 'assistant',
              content: data.content,
              timestamp: new Date(),
              isStreaming: true,
            },
          ]);
        }
        break;

      case 'mitly:complete':
        // Streaming complete
        if (streamingMessageIdRef.current) {
          setMessages((prev) => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            if (lastMsg && lastMsg.id === streamingMessageIdRef.current) {
              lastMsg.isStreaming = false;
            }
            return updated;
          });
          streamingMessageIdRef.current = null;
        }
        setIsProcessing(false);
        break;

      case 'mitly:error':
        console.error('[MITLY] Error:', data.error);
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: `Sorry, I encountered an error: ${data.error}`,
            timestamp: new Date(),
          },
        ]);
        setIsProcessing(false);
        streamingMessageIdRef.current = null;
        break;

      case 'mitly:pong':
        console.log('[MITLY] Pong received');
        break;

      default:
        console.warn('[MITLY] Unknown message type:', data.type);
    }
  }, []);

  const sendMessage = useCallback((content: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('[MITLY] WebSocket not connected');
      return;
    }

    if (!content.trim()) {
      return;
    }

    // Add user message to UI
    const userMessage: MitlyMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsProcessing(true);

    // Send to server
    wsRef.current.send(
      JSON.stringify({
        type: 'mitly:message',
        content: content.trim(),
      })
    );
  }, []);

  const ping = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'mitly:ping',
        })
      );
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    streamingMessageIdRef.current = null;
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ping every 30 seconds to keep connection alive
  useEffect(() => {
    const interval = setInterval(() => {
      if (status === 'connected') {
        ping();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [status, ping]);

  return {
    status,
    messages,
    isProcessing,
    sendMessage,
    clearMessages,
    connect,
    disconnect,
  };
}
