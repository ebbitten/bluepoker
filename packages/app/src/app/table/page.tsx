'use client';

import { useState } from 'react';
import { GameState, Player } from '@bluepoker/shared';

export default function TablePage() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameId, setGameId] = useState<string>('');
  const [player1Name, setPlayer1Name] = useState<string>('Player 1');
  const [player2Name, setPlayer2Name] = useState<string>('Player 2');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const createGame = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/game/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerNames: [player1Name, player2Name] })
      });
      
      const data = await response.json();
      if (response.ok) {
        setGameState(data.gameState);
        setGameId(data.gameId);
      } else {
        setError(data.error || 'Failed to create game');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const dealCards = async () => {
    if (!gameId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/game/${gameId}/deal`, {
        method: 'POST'
      });
      
      const data = await response.json();
      if (response.ok) {
        setGameState(data);
      } else {
        setError(data.error || 'Failed to deal cards');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const executeAction = async (playerId: string, action: 'fold' | 'call' | 'raise', amount?: number) => {
    if (!gameId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/game/${gameId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, action, amount })
      });
      
      const data = await response.json();
      if (response.ok && data.success) {
        setGameState(data.gameState);
      } else {
        setError(data.error || 'Failed to execute action');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
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
    if (!gameState) return false;
    const activePlayer = getActivePlayer();
    return activePlayer?.id === player.id && !player.folded && gameState.phase !== 'complete';
  };

  return (
    <div className="min-h-screen bg-green-800 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">Poker Table</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {!gameState ? (
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <h2 className="text-2xl font-bold mb-4">Create New Game</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">Player 1 Name</label>
                <input
                  type="text"
                  value={player1Name}
                  onChange={(e) => setPlayer1Name(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Player 2 Name</label>
                <input
                  type="text"
                  value={player2Name}
                  onChange={(e) => setPlayer2Name(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <button
              onClick={createGame}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Game'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Game Info */}
            <div className="bg-white rounded-lg p-4 shadow-lg">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">Game ID: {gameId}</h3>
                <div className="text-right">
                  <div className="text-lg font-bold">Phase: {gameState.phase}</div>
                  <div className="text-xl font-bold text-green-600">Pot: ${gameState.pot}</div>
                  <div className="text-md">Current Bet: ${gameState.currentBet}</div>
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
                          Call ${Math.max(0, gameState.currentBet - player.currentBet)}
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
                {gameState.players.every(p => p.holeCards.length === 0) && (
                  <button
                    onClick={dealCards}
                    disabled={loading}
                    className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                  >
                    {loading ? 'Dealing...' : 'Deal Cards'}
                  </button>
                )}
                <button
                  onClick={() => {
                    setGameState(null);
                    setGameId('');
                    setError('');
                  }}
                  className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                >
                  New Game
                </button>
              </div>
            </div>

            {/* Winner Display */}
            {gameState.phase === 'complete' && gameState.winner !== undefined && (
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded">
                <h3 className="text-lg font-bold">
                  🎉 {gameState.players[gameState.winner].name} wins! 
                  {gameState.winnerReason && ` (${gameState.winnerReason})`}
                </h3>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}