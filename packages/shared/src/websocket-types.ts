/**
 * WebSocket Message Types for Real-Time Poker Communication
 */

import { GameState } from './game-state';

// Client → Server Messages
export type ClientMessage = 
  | { type: 'playerAction'; data: { playerId: string; action: 'fold' | 'call' | 'raise'; amount?: number } }
  | { type: 'dealCards'; data: Record<string, never> }
  | { type: 'startNewHand'; data: Record<string, never> }
  | { type: 'ping'; data: { timestamp: number } }
  | { type: 'authenticate'; data: { playerId: string; gameId: string } };

// Server → Client Messages  
export type ServerMessage = 
  | { type: 'gameStateUpdate'; data: GameState }
  | { type: 'actionResult'; data: { success: boolean; error?: string; gameState?: GameState } }
  | { type: 'connected'; data: { gameId: string; connectionId: string } }
  | { type: 'playerJoined'; data: { playerId: string; playerName: string } }
  | { type: 'playerLeft'; data: { playerId: string } }
  | { type: 'error'; data: { message: string } }
  | { type: 'pong'; data: { timestamp: number } };

// WebSocket Message Envelope
export interface WebSocketMessage {
  id: string;           // Unique message ID
  type: string;         // Message type
  data: unknown;        // Message payload
  timestamp: number;    // Message timestamp
}

// WebSocket Connection Interface
export interface WebSocketConnection {
  id: string;
  gameId: string;
  playerId?: string;    // Set after authentication
  ws: WebSocket | any;  // WebSocket instance (any for server-side ws library compatibility)
  lastActivity: Date;
  authenticated: boolean;
}

// WebSocket Manager Interface
export interface WebSocketManager {
  addConnection(gameId: string, connection: WebSocketConnection): void;
  removeConnection(gameId: string, connectionId: string): void;
  broadcast(gameId: string, message: ServerMessage): void;
  sendToConnection(connectionId: string, message: ServerMessage): void;
  authenticateConnection(connectionId: string, playerId: string): boolean;
  getConnectionCount(gameId: string): number;
  cleanup(): void;
}

// WebSocket Error Codes
export enum WebSocketErrorCode {
  AUTHENTICATION_FAILED = 4001,
  INVALID_MESSAGE = 4002,
  SERVER_OVERLOAD = 4003,
  GAME_NOT_FOUND = 4004,
  RATE_LIMIT_EXCEEDED = 4005
}

// Message validation utilities
export function isValidClientMessage(message: unknown): message is ClientMessage {
  if (!message || typeof message !== 'object') return false;
  
  const msg = message as { type?: string; data?: unknown };
  const validTypes = ['playerAction', 'dealCards', 'startNewHand', 'ping', 'authenticate'];
  return typeof msg.type === 'string' && validTypes.includes(msg.type) && msg.data !== undefined;
}

export function isValidServerMessage(message: unknown): message is ServerMessage {
  if (!message || typeof message !== 'object') return false;
  
  const msg = message as { type?: string; data?: unknown };
  const validTypes = ['gameStateUpdate', 'actionResult', 'connected', 'playerJoined', 'playerLeft', 'error', 'pong'];
  return typeof msg.type === 'string' && validTypes.includes(msg.type) && msg.data !== undefined;
}

// Message creation helpers
export function createWebSocketMessage(type: string, data: unknown): WebSocketMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    data,
    timestamp: Date.now()
  };
}

export function createConnectedMessage(gameId: string, connectionId: string): ServerMessage {
  return {
    type: 'connected',
    data: { gameId, connectionId }
  };
}

export function createErrorMessage(message: string): ServerMessage {
  return {
    type: 'error',
    data: { message }
  };
}

export function createGameStateUpdateMessage(gameState: GameState): ServerMessage {
  return {
    type: 'gameStateUpdate',
    data: gameState
  };
}

export function createActionResultMessage(success: boolean, error?: string, gameState?: GameState): ServerMessage {
  return {
    type: 'actionResult',
    data: { success, error, gameState }
  };
}

export function createPongMessage(timestamp: number): ServerMessage {
  return {
    type: 'pong',
    data: { timestamp }
  };
}