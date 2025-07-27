import WebSocket from 'ws';
import { 
  WebSocketConnection, 
  ClientMessage,
  isValidClientMessage,
  createConnectedMessage,
  createErrorMessage,
  createGameStateUpdateMessage,
  createActionResultMessage,
  createPongMessage,
  WebSocketErrorCode 
} from '@bluepoker/shared';
import { wsManager } from './websocket-manager';
import { gameStore } from './game-store';
import { executePlayerAction, dealNewHand, startNewHand } from '@bluepoker/shared';
import { broadcaster } from './event-broadcaster';

// Message handler for WebSocket connections
export function handleWebSocketMessage(
  ws: WebSocket,
  connection: WebSocketConnection,
  message: string
): void {
  try {
    // Rate limiting check
    if (wsManager.isRateLimited(connection.id)) {
      const errorMsg = createErrorMessage('Rate limit exceeded');
      wsManager.sendToConnection(connection.id, errorMsg);
      
      // Close connection if severely rate limited
      setTimeout(() => {
        ws.close(WebSocketErrorCode.RATE_LIMIT_EXCEEDED, 'Rate limit exceeded');
      }, 1000);
      return;
    }
    
    // Parse message
    const parsed = JSON.parse(message);
    
    // Validate message structure
    if (!isValidClientMessage(parsed)) {
      const errorMsg = createErrorMessage('Invalid message format');
      wsManager.sendToConnection(connection.id, errorMsg);
      return;
    }
    
    const clientMessage = parsed as ClientMessage;
    console.log(`Received ${clientMessage.type} from connection ${connection.id}`);
    
    // Route message based on type
    switch (clientMessage.type) {
      case 'authenticate':
        handleAuthenticate(connection, clientMessage.data);
        break;
        
      case 'ping':
        handlePing(connection, clientMessage.data);
        break;
        
      case 'playerAction':
        handlePlayerAction(connection, clientMessage.data);
        break;
        
      case 'dealCards':
        handleDealCards(connection);
        break;
        
      case 'startNewHand':
        handleStartNewHand(connection);
        break;
        
      default:
        const errorMsg = createErrorMessage(`Unknown message type: ${(clientMessage as {type: string}).type}`);
        wsManager.sendToConnection(connection.id, errorMsg);
    }
    
  } catch (error) {
    console.error(`Error handling WebSocket message from ${connection.id}:`, error);
    const errorMsg = createErrorMessage('Invalid message format');
    wsManager.sendToConnection(connection.id, errorMsg);
  }
}

// Authentication handler
function handleAuthenticate(
  connection: WebSocketConnection,
  data: { playerId: string; gameId: string }
): void {
  const { playerId, gameId } = data;
  
  // Validate game exists
  const gameState = gameStore.get(gameId);
  if (!gameState) {
    const errorMsg = createErrorMessage('Game not found');
    wsManager.sendToConnection(connection.id, errorMsg);
    connection.ws.close(WebSocketErrorCode.GAME_NOT_FOUND, 'Game not found');
    return;
  }
  
  // Validate player exists in game
  const playerExists = gameState.players.some(p => p.id === playerId);
  if (!playerExists) {
    const errorMsg = createErrorMessage('Player not found in game');
    wsManager.sendToConnection(connection.id, errorMsg);
    connection.ws.close(WebSocketErrorCode.AUTHENTICATION_FAILED, 'Player not found');
    return;
  }
  
  // Authenticate connection
  const success = wsManager.authenticateConnection(connection.id, playerId);
  if (success) {
    // Send connected confirmation
    const connectedMsg = createConnectedMessage(gameId, connection.id);
    wsManager.sendToConnection(connection.id, connectedMsg);
    
    // Send current game state
    const gameStateMsg = createGameStateUpdateMessage(gameState);
    wsManager.sendToConnection(connection.id, gameStateMsg);
    
    console.log(`Player ${playerId} authenticated on connection ${connection.id}`);
  } else {
    const errorMsg = createErrorMessage('Authentication failed');
    wsManager.sendToConnection(connection.id, errorMsg);
  }
}

// Ping/pong handler
function handlePing(
  connection: WebSocketConnection,
  data: { timestamp: number }
): void {
  const pongMsg = createPongMessage(data.timestamp);
  wsManager.sendToConnection(connection.id, pongMsg);
}

// Player action handler
function handlePlayerAction(
  connection: WebSocketConnection,
  data: { playerId: string; action: 'fold' | 'call' | 'raise'; amount?: number }
): void {
  if (!connection.authenticated) {
    const errorMsg = createErrorMessage('Not authenticated');
    wsManager.sendToConnection(connection.id, errorMsg);
    return;
  }
  
  const { playerId, action, amount } = data;
  
  // Validate authenticated player matches action player
  if (connection.playerId !== playerId) {
    const errorMsg = createErrorMessage('Player ID mismatch');
    wsManager.sendToConnection(connection.id, errorMsg);
    return;
  }
  
  // Get current game state
  const gameState = gameStore.get(connection.gameId);
  if (!gameState) {
    const errorMsg = createErrorMessage('Game not found');
    wsManager.sendToConnection(connection.id, errorMsg);
    return;
  }
  
  // Execute player action
  const result = executePlayerAction(gameState, playerId, action, amount);
  
  // Send action result to the acting player
  const actionResultMsg = createActionResultMessage(
    result.success,
    result.error,
    result.success ? result.gameState : undefined
  );
  wsManager.sendToConnection(connection.id, actionResultMsg);
  
  if (result.success) {
    // Update stored game state
    gameStore.set(connection.gameId, result.gameState);
    
    // Broadcast updated game state to all connections
    const gameStateMsg = createGameStateUpdateMessage(result.gameState);
    wsManager.broadcast(connection.gameId, gameStateMsg);
    
    // Also broadcast via SSE for backwards compatibility
    broadcaster.broadcast(connection.gameId, {
      type: 'gameStateUpdate',
      data: result.gameState
    });
    
    console.log(`Player ${playerId} executed ${action} successfully`);
  } else {
    console.log(`Player ${playerId} action ${action} failed: ${result.error}`);
  }
}

// Deal cards handler
function handleDealCards(connection: WebSocketConnection): void {
  if (!connection.authenticated) {
    const errorMsg = createErrorMessage('Not authenticated');
    wsManager.sendToConnection(connection.id, errorMsg);
    return;
  }
  
  // Get current game state
  const gameState = gameStore.get(connection.gameId);
  if (!gameState) {
    const errorMsg = createErrorMessage('Game not found');
    wsManager.sendToConnection(connection.id, errorMsg);
    return;
  }
  
  try {
    // Deal new hand
    const newGameState = dealNewHand(gameState);
    
    // Update stored game state
    gameStore.set(connection.gameId, newGameState);
    
    // Send success result
    const actionResultMsg = createActionResultMessage(true, undefined, newGameState);
    wsManager.sendToConnection(connection.id, actionResultMsg);
    
    // Broadcast updated game state
    const gameStateMsg = createGameStateUpdateMessage(newGameState);
    wsManager.broadcast(connection.gameId, gameStateMsg);
    
    // Also broadcast via SSE for backwards compatibility
    broadcaster.broadcast(connection.gameId, {
      type: 'gameStateUpdate',
      data: newGameState
    });
    
    console.log(`Cards dealt for game ${connection.gameId}`);
    
  } catch (error) {
    console.error('Error dealing cards:', error);
    const errorMsg = createErrorMessage('Failed to deal cards');
    wsManager.sendToConnection(connection.id, errorMsg);
  }
}

// Start new hand handler
function handleStartNewHand(connection: WebSocketConnection): void {
  if (!connection.authenticated) {
    const errorMsg = createErrorMessage('Not authenticated');
    wsManager.sendToConnection(connection.id, errorMsg);
    return;
  }
  
  // Get current game state
  const gameState = gameStore.get(connection.gameId);
  if (!gameState) {
    const errorMsg = createErrorMessage('Game not found');
    wsManager.sendToConnection(connection.id, errorMsg);
    return;
  }
  
  try {
    // Start new hand (includes dealing)
    const newGameState = startNewHand(gameState);
    
    // Update stored game state
    gameStore.set(connection.gameId, newGameState);
    
    // Send success result
    const actionResultMsg = createActionResultMessage(true, undefined, newGameState);
    wsManager.sendToConnection(connection.id, actionResultMsg);
    
    // Broadcast updated game state
    const gameStateMsg = createGameStateUpdateMessage(newGameState);
    wsManager.broadcast(connection.gameId, gameStateMsg);
    
    // Also broadcast via SSE for backwards compatibility
    broadcaster.broadcast(connection.gameId, {
      type: 'gameStateUpdate',
      data: newGameState
    });
    
    console.log(`New hand started for game ${connection.gameId}`);
    
  } catch (error) {
    console.error('Error starting new hand:', error);
    const errorMsg = createErrorMessage('Failed to start new hand');
    wsManager.sendToConnection(connection.id, errorMsg);
  }
}

// Create a WebSocket connection object
export function createWebSocketConnection(
  gameId: string,
  ws: WebSocket
): WebSocketConnection {
  const connectionId = `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    id: connectionId,
    gameId,
    ws,
    lastActivity: new Date(),
    authenticated: false
  };
}