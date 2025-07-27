/**
 * React Hook for WebSocket Communication with Poker Game Server
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ClientMessage, 
  WebSocketMessage,
  GameState,
  createWebSocketMessage 
} from '@bluepoker/shared';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface UseWebSocketOptions {
  gameId: string;
  playerId?: string;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

export interface UseWebSocketReturn {
  // Connection state
  connectionStatus: ConnectionStatus;
  gameState: GameState | null;
  error: string | null;
  
  // Connection control
  connect: () => void;
  disconnect: () => void;
  
  // Game actions via WebSocket
  authenticate: (playerId: string) => void;
  sendPlayerAction: (action: 'fold' | 'call' | 'raise', amount?: number) => void;
  dealCards: () => void;
  startNewHand: () => void;
  
  // Low-level message sending
  sendMessage: (message: ClientMessage) => void;
  
  // Connection info
  isConnected: boolean;
  isAuthenticated: boolean;
}

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const {
    gameId,
    playerId,
    autoConnect = true,
    reconnectAttempts = 3,
    reconnectInterval = 3000
  } = options;
  
  // State
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Refs for persistent values
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectCountRef = useRef(0);
  const isManualDisconnectRef = useRef(false);
  const messageQueueRef = useRef<ClientMessage[]>([]);
  
  // Derived state
  const isConnected = connectionStatus === 'connected';
  
  // Clear any pending reconnection timeout
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);
  
  // Send message to WebSocket
  const sendMessage = useCallback((message: ClientMessage) => {
    const ws = wsRef.current;
    
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.log('WebSocket not connected, queueing message:', message);
      messageQueueRef.current.push(message);
      return;
    }
    
    try {
      const wsMessage = createWebSocketMessage(message.type, message.data);
      ws.send(JSON.stringify(wsMessage));
      console.log('WebSocket message sent:', message.type);
    } catch (err) {
      console.error('Failed to send WebSocket message:', err);
      setError('Failed to send message to server');
    }
  }, []);

  // Process incoming WebSocket messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const wsMessage: WebSocketMessage = JSON.parse(event.data);
      console.log('WebSocket message received:', wsMessage.type, wsMessage);
      
      switch (wsMessage.type) {
        case 'connected':
          console.log('WebSocket connection confirmed');
          setConnectionStatus('connected');
          setError(null);
          reconnectCountRef.current = 0;
          
          // Process queued messages
          messageQueueRef.current.forEach(message => {
            sendMessage(message);
          });
          messageQueueRef.current = [];
          
          // Auto-authenticate if playerId is provided
          if (playerId && !isAuthenticated) {
            sendMessage({
              type: 'authenticate',
              data: { playerId, gameId }
            });
            setIsAuthenticated(true);
          }
          break;
          
        case 'gameStateUpdate':
          setGameState(wsMessage.data as GameState);
          break;
          
        case 'actionResult':
          const result = wsMessage.data as { success: boolean; error?: string; gameState?: GameState };
          if (!result.success && result.error) {
            setError(result.error);
          } else {
            setError(null);
          }
          
          // Update game state if provided
          if (result.gameState) {
            setGameState(result.gameState);
          }
          break;
          
        case 'error':
          const errorData = wsMessage.data as { message: string };
          setError(errorData.message);
          console.error('WebSocket error message:', errorData.message);
          break;
          
        case 'pong':
          // Handle pong response (keep connection alive)
          console.log('Pong received');
          break;
          
        default:
          console.log('Unknown WebSocket message type:', wsMessage.type);
      }
    } catch (err) {
      console.error('Failed to parse WebSocket message:', err);
      setError('Failed to parse server message');
    }
  }, [playerId, isAuthenticated, sendMessage, gameId]);

  // Handle WebSocket connection open
  const handleOpen = useCallback(() => {
    console.log('WebSocket connection opened');
    setConnectionStatus('connected');
    setError(null);
  }, []);

  // Handle WebSocket errors
  const handleError = useCallback((event: Event) => {
    console.error('WebSocket error:', event);
    setError('WebSocket connection error');
    setConnectionStatus('error');
  }, []);

  // Forward declaration for connect function
  const connectRef = useRef<() => void>(() => {});

  // Handle WebSocket connection close
  const handleClose = useCallback((event: CloseEvent) => {
    console.log('WebSocket connection closed:', event.code, event.reason);
    
    wsRef.current = null;
    setConnectionStatus('disconnected');
    setIsAuthenticated(false);
    
    // Attempt reconnection if not manually disconnected
    if (!isManualDisconnectRef.current && reconnectCountRef.current < reconnectAttempts) {
      reconnectCountRef.current++;
      console.log(`Attempting reconnection ${reconnectCountRef.current}/${reconnectAttempts}...`);
      
      setConnectionStatus('connecting');
      reconnectTimeoutRef.current = setTimeout(() => {
        connectRef.current?.();
      }, reconnectInterval);
    } else if (reconnectCountRef.current >= reconnectAttempts) {
      setError('Maximum reconnection attempts reached. Please refresh the page.');
      setConnectionStatus('error');
    }
  }, [reconnectAttempts, reconnectInterval]);
  
  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }
    
    console.log(`Connecting to WebSocket for game ${gameId}...`);
    setConnectionStatus('connecting');
    setError(null);
    isManualDisconnectRef.current = false;
    
    try {
      // Determine WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/game/${gameId}/ws`;
      
      // Create WebSocket connection
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      // Set up event handlers
      ws.onopen = handleOpen;
      ws.onmessage = handleMessage;
      ws.onclose = handleClose;
      ws.onerror = handleError;
      
    } catch (err) {
      console.error('Failed to create WebSocket connection:', err);
      setError('Failed to connect to game server');
      setConnectionStatus('error');
    }
  }, [gameId, handleOpen, handleMessage, handleClose, handleError]);

  // Update the connect ref
  connectRef.current = connect;
  
  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    console.log('Manually disconnecting WebSocket');
    isManualDisconnectRef.current = true;
    clearReconnectTimeout();
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
    }
    
    setConnectionStatus('disconnected');
    setIsAuthenticated(false);
  }, [clearReconnectTimeout]);
  
  // Authentication
  const authenticate = useCallback((playerIdToAuth: string) => {
    console.log(`Authenticating as player ${playerIdToAuth}`);
    sendMessage({
      type: 'authenticate',
      data: { playerId: playerIdToAuth, gameId }
    });
    setIsAuthenticated(true);
  }, [gameId, sendMessage]);
  
  // Game actions
  const sendPlayerAction = useCallback((action: 'fold' | 'call' | 'raise', amount?: number) => {
    if (!playerId) {
      setError('Player ID not set');
      return;
    }
    
    sendMessage({
      type: 'playerAction',
      data: { playerId, action, amount }
    });
  }, [playerId, sendMessage]);
  
  const dealCards = useCallback(() => {
    sendMessage({
      type: 'dealCards',
      data: {}
    });
  }, [sendMessage]);
  
  const startNewHand = useCallback(() => {
    sendMessage({
      type: 'startNewHand',
      data: {}
    });
  }, [sendMessage]);
  
  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && gameId) {
      connect();
    }
    
    return () => {
      isManualDisconnectRef.current = true;
      clearReconnectTimeout();
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmount');
      }
    };
  }, [gameId, autoConnect, connect, clearReconnectTimeout]);
  
  // Ping/keepalive mechanism
  useEffect(() => {
    if (!isConnected) return;
    
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        sendMessage({
          type: 'ping',
          data: { timestamp: Date.now() }
        });
      }
    }, 30000); // Ping every 30 seconds
    
    return () => clearInterval(pingInterval);
  }, [isConnected, sendMessage]);
  
  return {
    // Connection state
    connectionStatus,
    gameState,
    error,
    
    // Connection control
    connect,
    disconnect,
    
    // Game actions
    authenticate,
    sendPlayerAction,
    dealCards,
    startNewHand,
    
    // Low-level
    sendMessage,
    
    // Derived state
    isConnected,
    isAuthenticated
  };
}