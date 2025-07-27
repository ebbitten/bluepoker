'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';

export default function TablePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [player1Name] = useState<string>(user?.username || 'Player 1');
  const [player2Name, setPlayer2Name] = useState<string>('Player 2');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const createGame = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/game/create', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.id}`
        },
        body: JSON.stringify({ 
          playerNames: [user?.username || player1Name, player2Name],
          createdBy: user?.id
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        // Redirect to the game-specific URL
        router.push(`/table/${data.gameId}`);
      } else {
        setError(data.error || 'Failed to create game');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-green-800 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-white">Poker Table</h1>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/lobby')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              Game Lobby
            </button>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg p-6 shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Create New Game</h2>
          <p className="text-gray-600 mb-6">
            Create a new poker game and share the link with another player to join!
          </p>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">Player 1 (You)</label>
              <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md">
                {user?.username}
              </div>
              <p className="text-xs text-gray-500 mt-1">Your authenticated username</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Player 2 Name</label>
              <input
                type="text"
                value={player2Name}
                onChange={(e) => setPlayer2Name(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter player 2 name"
              />
            </div>
          </div>
          
          <button
            onClick={createGame}
            disabled={loading || !user?.username || !player2Name.trim()}
            className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Game...' : 'Create Game & Get Shareable Link'}
          </button>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-bold text-blue-800 mb-2">How it works:</h3>
            <ol className="text-sm text-blue-700 space-y-1">
              <li>1. Enter player names and click &quot;Create Game&quot;</li>
              <li>2. You&apos;ll get a unique game URL like: <code className="bg-blue-100 px-1 rounded">localhost:3000/table/abc123</code></li>
              <li>3. Share this URL with the other player</li>
              <li>4. Both players can view and interact with the same game in real-time!</li>
            </ol>
          </div>
          
          <div className="mt-4 text-center">
            <button
              onClick={() => router.push('/debug')}
              className="text-sm text-gray-600 hover:text-gray-800 underline"
            >
              🔧 Debug Dashboard
            </button>
          </div>
        </div>
      </div>
      </div>
    </ProtectedRoute>
  );
}