/**
 * AI Assistant API
 * 
 * WebSocket-based integration with GPT-4o-mini for meeting creation
 */

// WebSocket connection singleton
let wsConnection: WebSocket | null = null;
let isConnected = false;

// Event listeners
type MessageListener = (data: any) => void;
const messageListeners: Map<string, MessageListener> = new Map();

// Response types
export type MeetingDraft = {
  title: string;
  meetingType: 'INSTANT' | 'SCHEDULED';
  scheduledAt?: string;
  durationMinutes: number;
  participants?: Array<{
    name?: string;
    email?: string;
  }>;
  location?: string;
};

// Connection config
const WS_CONNECT_TIMEOUT_MS = 10000;

/**
 * Initialize the WebSocket connection
 * Resolves when connected message is received from server
 */
export function initWebSocket(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    // Reuse existing open connection
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN && isConnected) {
      console.log('[WS] Reusing existing connection');
      resolve(wsConnection);
      return;
    }
    
    // Close any existing connection before creating new one
    if (wsConnection) {
      console.log('[WS] Closing stale connection');
      try {
        wsConnection.onclose = null; // Prevent close handler from firing
        wsConnection.onerror = null;
        wsConnection.onmessage = null;
        wsConnection.close();
      } catch (err) {
        console.error('[WS] Error closing stale connection:', err);
      }
      wsConnection = null;
      isConnected = false;
    }
    
    // Get base URL and construct WebSocket URL
    // Handle case where NEXT_PUBLIC_API_URL may include /api/v1 path
    let baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    // Extract just the origin (protocol + host + port) from the URL
    try {
      const url = new URL(baseUrl);
      baseUrl = url.origin;
    } catch {
      // If URL parsing fails, strip any path manually
      baseUrl = baseUrl.replace(/\/api\/v1\/?$/, '');
    }
    
    const wsUrl = baseUrl.replace(/^http/, 'ws') + '/api/v1/ws';
    
    console.log(`[WS] Connecting to: ${wsUrl}`);
    
    let resolved = false;
    
    const connectionTimeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.error('[WS] Connection timeout');
        if (wsConnection) {
          wsConnection.close();
          wsConnection = null;
        }
        reject(new Error('WebSocket connection timeout'));
      }
    }, WS_CONNECT_TIMEOUT_MS);
    
    try {
      wsConnection = new WebSocket(wsUrl);
      
      wsConnection.onopen = () => {
        console.log('[WS] Socket opened, waiting for connected message');
      };
      
      wsConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log(`[WS] Received message: ${data.type}`);
          
          // Resolve connection on connected message
          if (data.type === 'connected' && !resolved) {
            resolved = true;
            clearTimeout(connectionTimeout);
            isConnected = true;
            console.log('[WS] Connection established');
            resolve(wsConnection!);
            return;
          }
          
          // Call registered listeners for other messages
          if (data.type && messageListeners.has(data.type)) {
            messageListeners.get(data.type)?.(data);
          }
        } catch (err) {
          console.error('[WS] Error parsing message:', err);
        }
      };
      
      wsConnection.onerror = (error) => {
        console.error('[WS] Socket error:', error);
        if (!resolved) {
          resolved = true;
          clearTimeout(connectionTimeout);
          isConnected = false;
          reject(new Error('WebSocket connection error'));
        }
      };
      
      wsConnection.onclose = (event) => {
        console.log(`[WS] Socket closed: code=${event.code}, reason=${event.reason}`);
        isConnected = false;
        if (!resolved) {
          resolved = true;
          clearTimeout(connectionTimeout);
          reject(new Error(`WebSocket closed unexpectedly: code=${event.code}`));
        }
      };
      
    } catch (error) {
      console.error('[WS] Error creating WebSocket:', error);
      clearTimeout(connectionTimeout);
      reject(error);
    }
  });
}

/**
 * Register a listener for a specific message type
 */
export function on(messageType: string, callback: MessageListener): void {
  messageListeners.set(messageType, callback);
}

/**
 * Remove a listener for a specific message type
 */
export function off(messageType: string): void {
  messageListeners.delete(messageType);
}

/**
 * Generate a meeting draft using GPT-4o-mini
 * @param input Natural language description of the meeting
 * @returns Promise that resolves when draft is generated
 */
export async function generateMeetingDraft(input: string): Promise<MeetingDraft> {
  // Initialize WebSocket connection
  const ws = await initWebSocket();
  
  return new Promise((resolve, reject) => {
    // Set up one-time listener for response
    const messageHandler = (data: any) => {
      off('meetingDraftGenerated');
      clearTimeout(timeout);
      
      if (data.error) {
        console.error('[WS] Draft generation error:', data.error);
        reject(new Error(data.error));
      } else {
        console.log('[WS] Draft received successfully');
        resolve(data.draft);
      }
    };
    
    on('meetingDraftGenerated', messageHandler);
    
    // Timeout after 30 seconds
    const timeout = setTimeout(() => {
      off('meetingDraftGenerated');
      console.error('[WS] Draft generation timed out');
      reject(new Error('AI assistant timed out - please try again'));
    }, 30000);
    
    // Send the request (no auth/workflow data needed)
    const requestData = {
      type: 'generateMeetingDraft',
      input
    };
    
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(requestData));
      console.log('[WS] Sent generateMeetingDraft request');
    } else {
      clearTimeout(timeout);
      off('meetingDraftGenerated');
      reject(new Error('WebSocket not connected'));
    }
  });
}

/**
 * Test WebSocket connection
 */
export async function testConnection(): Promise<{status: string, latency: number}> {
  const startTime = Date.now();
  
  try {
    await initWebSocket();
    
    return {
      status: 'connected',
      latency: Date.now() - startTime
    };
  } catch (error) {
    throw new Error('WebSocket connection failed');
  }
}

/**
 * Close the WebSocket connection
 */
export function closeConnection(): void {
  if (wsConnection) {
    console.log('[WS] Closing connection');
    wsConnection.onclose = null; // Prevent handler from firing
    wsConnection.close();
    wsConnection = null;
    isConnected = false;
  }
}
