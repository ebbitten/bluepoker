'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, Player } from '@bluepoker/shared';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { useAuth } from '../../../contexts/AuthContext';

export default function GameTablePage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [gameNotFound, setGameNotFound] = useState<boolean>(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);

  // Load game state from REST API with authentication
  const loadGame = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    setError('');
    setGameNotFound(false);

    try {
      const response = await fetch(`/api/game/${gameId}`, {
        headers: {
          'Authorization': `Bearer ${user.id}`
        }
      });
      
      if (response.status === 404) {
        setGameNotFound(true);
        setError(`Game ${gameId} not found`);
        return;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const gameStateData: GameState = await response.json();
      setGameState(gameStateData);
      
    } catch (err) {
      console.error('Failed to load game:', err);
      setError('Failed to load game');
      setGameNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [gameId, user]);

  // Connect to real-time updates via SSE with authentication
  const connectToRealTime = useCallback(() => {
    if (!user) return;
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setConnectionStatus('connecting');
    
    const sseUrl = `/api/game/${gameId}/events?token=${user.id}`;
    
    console.log('🔄 Connecting to SSE:', sseUrl);
    
    // Pass auth token as query parameter for SSE (EventSource doesn't support headers)
    const eventSource = new EventSource(sseUrl);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('SSE connection opened');
      setConnectionStatus('connected');
      setError('');
    };

    eventSource.addEventListener('gameStateUpdate', (event) => {
      try {
        const newGameState = JSON.parse(event.data);
        console.log('Real-time game state update:', newGameState);
        setGameState(newGameState);
        setLastUpdate(new Date());
        setLoading(false);
      } catch (err) {
        console.error('Failed to parse game state update:', err);
      }
    });

    eventSource.addEventListener('connected', (event) => {
      console.log('SSE connected event:', event.data);
    });

    eventSource.addEventListener('keepAlive', () => {
      console.log('SSE keep-alive received');
      setLastUpdate(new Date());
    });

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      setConnectionStatus('disconnected');
      setError('Real-time connection lost');
    };
  }, [gameId, user]);

  // Load game on mount and connect to real-time updates
  useEffect(() => {
    if (gameId) {
      loadGame().then(() => {
        // Connect to real-time updates after initial load
        connectToRealTime();
      });
    }

    // Cleanup SSE connection on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [gameId, loadGame, connectToRealTime]);

  // Simple action handlers using REST API with authentication
  const dealCards = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const apiUrl = `/api/game/${gameId}/deal`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`
        }
      });
      
      if (response.ok) {
        const newGameState = await response.json();
        setGameState(newGameState);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to deal cards');
      }
    } catch (err) {
      setError('Failed to deal cards');
    } finally {
      setLoading(false);
    }
  };

  const executeAction = async (playerId: string, action: 'fold' | 'call' | 'raise', amount?: number) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const apiUrl = `/api/game/${gameId}/action`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`
        },
        body: JSON.stringify({ playerId, action, amount, userId: user.id })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setGameState(result.gameState);
      } else {
        setError(result.error || 'Action failed');
      }
    } catch (err) {
      setError('Failed to execute action');
    } finally {
      setLoading(false);
    }
  };

  const startNewHand = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const apiUrl = `/api/game/${gameId}/new-hand`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`
        }
      });
      
      if (response.ok) {
        const newGameState = await response.json();
        setGameState(newGameState);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to start new hand');
      }
    } catch (err) {
      setError('Failed to start new hand');
    } finally {
      setLoading(false);
    }
  };

  const copyGameUrl = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setError('✅ Game URL copied to clipboard!');
    setTimeout(() => setError(''), 3000);
  };

  const retryConnection = () => {
    setError('');
    connectToRealTime();
  };

  const formatCard = (card: { suit: string; rank: string }) => {
    const suitSymbols = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
    const suitColors = { hearts: 'text-red-500', diamonds: 'text-red-500', clubs: 'text-black', spades: 'text-black' };
    return (
      <span className={`font-bold ${suitColors[card.suit as keyof typeof suitColors]}`}>
        {card.rank}{suitSymbols[card.suit as keyof typeof suitSymbols]}
      </span>
    );
  };

  const getActivePlayer = (): Player | null => {
    if (!gameState) return null;
    return gameState.players[gameState.activePlayerIndex] || null;
  };

  const canPlayerAct = (player: Player): boolean => {
    if (!gameState || !user) return false;
    const activePlayer = getActivePlayer();
    // Only allow authenticated user to act on their own behalf
    return activePlayer?.id === player.id && 
           !player.folded && 
           gameState.phase !== 'complete' &&
           player.name === user?.username; // Match player to authenticated user
  };

  if (loading && !gameState) {
    return (
      <div className="min-h-screen bg-green-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading game...</div>
      </div>
    );
  }

  if (gameNotFound) {
    return (
      <div className="min-h-screen bg-green-800 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-8 text-center">Game Not Found</h1>
          <div className="bg-white rounded-lg p-6 shadow-lg text-center">
            <h2 className="text-2xl font-bold mb-4 text-red-600">Game &quot;{gameId}&quot; does not exist</h2>
            <p className="mb-4 text-gray-600">This game may have ended or the ID is incorrect.</p>
            <div className="space-x-4">
              <button
                onClick={() => router.push('/table')}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Create New Game
              </button>
              <button
                onClick={() => router.push('/debug')}
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
              >
                Debug Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-green-800 flex items-center justify-center">
        <div className="text-white text-xl">No game data available</div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-green-800 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">Poker Table</h1>
        
        {error && (
          <div className={`mb-4 p-4 rounded-lg ${error.startsWith('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 border border-red-400 text-red-700'}`}>
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Game Info */}
          <div className="bg-white rounded-lg p-4 shadow-lg">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">Game ID: {gameId}</h3>
                <button
                  onClick={copyGameUrl}
                  className="text-sm text-blue-600 hover:text-blue-800 underline mt-1"
                >
                  📋 Copy shareable link
                </button>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">Hand #{gameState.handNumber}</div>
                <div className="text-lg font-bold">Phase: {gameState.phase}</div>
                <div className="text-xl font-bold text-green-600">Pot: ${gameState.pot}</div>
                <div className="text-md">Current Bet: ${gameState.currentBet}</div>
                <div className="text-sm flex items-center justify-end mt-1">
                  <span className="mr-2">Connection:</span>
                  <div className={`w-2 h-2 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-green-500' :
                    connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                    'bg-red-500'
                  }`}></div>
                  <span className="ml-1 text-xs">
                    {connectionStatus === 'connected' ? 'Real-time' :
                     connectionStatus === 'connecting' ? 'Connecting...' :
                     'Disconnected'}
                  </span>
                  {connectionStatus === 'disconnected' && (
                    <button
                      onClick={retryConnection}
                      className="ml-2 text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Retry
                    </button>
                  )}
                  {lastUpdate && (
                    <span className="ml-2 text-xs text-gray-500">
                      Updated: {lastUpdate.toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Community Cards */}
          <div className="bg-white rounded-lg p-4 shadow-lg">
            <h3 className="text-lg font-bold mb-2">Community Cards</h3>
            <div className="flex space-x-2">
              {gameState.communityCards.length === 0 ? (
                <span className="text-gray-500">No community cards yet</span>
              ) : (
                gameState.communityCards.map((card, cardIndex) => (
                  <div key={cardIndex} className="bg-white border-2 border-gray-300 rounded-lg p-2 text-lg">
                    {formatCard(card)}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Players */}
          <div className="grid grid-cols-2 gap-6">
            {gameState.players.map((player) => (
              <div 
                key={player.id} 
                className={`bg-white rounded-lg p-4 shadow-lg border-2 ${
                  canPlayerAct(player) ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'
                }`}
              >
                <h3 className="text-lg font-bold mb-2">
                  {player.name} 
                  {gameState.dealerIndex === gameState.players.indexOf(player) && (
                    <span className="bg-red-600 text-white px-2 py-1 rounded-full text-xs ml-2">D</span>
                  )}
                  {canPlayerAct(player) && <span className="text-yellow-600 ml-2">(Your Turn)</span>}
                  {player.folded && <span className="text-red-600 ml-2">(Folded)</span>}
                  {player.allIn && <span className="text-orange-600 ml-2">(All-In)</span>}
                </h3>
                
                <div className="mb-2">
                  <div className="font-medium">Chips: ${player.chips}</div>
                  <div className="text-sm text-gray-600">Current Bet: ${player.currentBet}</div>
                </div>

                {/* Hole Cards */}
                <div className="mb-4">
                  <div className="text-sm font-medium mb-1">Hole Cards:</div>
                  <div className="flex space-x-1">
                    {player.holeCards.length === 0 ? (
                      <span className="text-gray-500 text-sm">No cards</span>
                    ) : (
                      player.holeCards.map((card, cardIndex) => (
                        <div key={cardIndex} className="bg-white border border-gray-300 rounded p-1 text-sm">
                          {formatCard(card)}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                {canPlayerAct(player) && (
                  <div className="space-y-2">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => executeAction(player.id, 'fold')}
                        disabled={loading}
                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-sm disabled:opacity-50"
                      >
                        Fold
                      </button>
                      <button
                        onClick={() => executeAction(player.id, 'call')}
                        disabled={loading}
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-sm disabled:opacity-50"
                      >
                        {Math.max(0, gameState.currentBet - player.currentBet) === 0 
                          ? 'Check' 
                          : `Call $${Math.max(0, gameState.currentBet - player.currentBet)}`}
                      </button>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          const minRaise = gameState.currentBet > 0 ? gameState.currentBet * 2 : 20;
                          executeAction(player.id, 'raise', minRaise);
                        }}
                        disabled={loading}
                        className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-3 rounded text-sm disabled:opacity-50"
                      >
                        Raise to ${gameState.currentBet > 0 ? gameState.currentBet * 2 : 20}
                      </button>
                      <button
                        onClick={() => executeAction(player.id, 'raise', player.chips + player.currentBet)}
                        disabled={loading || player.chips === 0}
                        className="bg-orange-500 hover:bg-orange-700 text-white font-bold py-1 px-3 rounded text-sm disabled:opacity-50"
                      >
                        All-In (${player.chips + player.currentBet})
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Game Controls */}
          <div className="bg-white rounded-lg p-4 shadow-lg">
            <h3 className="text-lg font-bold mb-2">Game Controls</h3>
            <div className="flex space-x-4">
              {gameState.phase === 'waiting' && (
                <button
                  onClick={dealCards}
                  disabled={loading}
                  className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                >
                  {loading ? 'Dealing...' : 'Deal Cards'}
                </button>
              )}
              {gameState.phase === 'complete' && (
                <button
                  onClick={startNewHand}
                  disabled={loading}
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                >
                  {loading ? 'Starting...' : 'Start New Hand'}
                </button>
              )}
              <button
                onClick={() => router.push('/table')}
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
              >
                New Game
              </button>
              <button
                onClick={() => router.push('/debug')}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Debug
              </button>
            </div>
          </div>

          {/* Winner Display */}
          {gameState.phase === 'complete' && gameState.winner !== undefined && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded">
              <h3 className="text-lg font-bold">
                🎉 Hand #{gameState.handNumber} - {gameState.players[gameState.winner].name} wins! 
                {gameState.winnerReason && ` (${gameState.winnerReason})`}
              </h3>
              <p className="text-sm mt-2">
                Click &quot;Start New Hand&quot; to continue playing or &quot;New Game&quot; to start fresh.
              </p>
            </div>
          )}
        </div>
      </div>
      </div>
    </ProtectedRoute>
  );
}