'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface HealthData {
  status: string;
  timestamp: number;
  server: string;
  endpoints: Record<string, { status: string; details?: string }>;
  gameStore: {
    activeGames: number;
    games: string[];
  };
}

interface SSETestData {
  status: string;
  gameId: string;
  tests: Record<string, { status: string; details?: string }>;
  broadcaster: {
    connectionCount: number;
    connections: string[];
  };
  recommendations: string[];
}

interface GameValidationData {
  status: string;
  gameId: string;
  exists: boolean;
  details: Record<string, unknown>;
  issues: string[];
  recommendations: string[];
}

export default function DebugPage() {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [sseTestData, setSSETestData] = useState<SSETestData | null>(null);
  const [gameValidationData, setGameValidationData] = useState<GameValidationData | null>(null);
  const [testGameId, setTestGameId] = useState<string>('');
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string>('');

  const setLoadingState = (key: string, isLoading: boolean) => {
    setLoading(prev => ({ ...prev, [key]: isLoading }));
  };

  const fetchHealthData = useCallback(async () => {
    setLoadingState('health', true);
    setError('');
    try {
      const response = await fetch('/api/debug/health');
      const data = await response.json();
      setHealthData(data);
    } catch (err) {
      setError('Failed to fetch health data');
    } finally {
      setLoadingState('health', false);
    }
  }, []);

  const runSSETest = async (gameId?: string) => {
    setLoadingState('sse', true);
    setError('');
    try {
      const url = gameId ? `/api/debug/sse-test?gameId=${gameId}` : '/api/debug/sse-test';
      const response = await fetch(url);
      const data = await response.json();
      setSSETestData(data);
      if (data.gameId && data.gameId !== 'none provided') {
        setTestGameId(data.gameId);
      }
    } catch (err) {
      setError('Failed to run SSE test');
    } finally {
      setLoadingState('sse', false);
    }
  };

  const validateGame = async (gameId: string) => {
    if (!gameId.trim()) {
      setError('Please provide a game ID');
      return;
    }
    
    setLoadingState('validate', true);
    setError('');
    try {
      const response = await fetch(`/api/debug/validate-game?gameId=${gameId}`);
      const data = await response.json();
      setGameValidationData(data);
    } catch (err) {
      setError('Failed to validate game');
    } finally {
      setLoadingState('validate', false);
    }
  };

  const createTestGame = async () => {
    setLoadingState('createGame', true);
    setError('');
    try {
      const response = await fetch('/api/game/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerNames: ['DebugUser1', 'DebugUser2'] })
      });
      const data = await response.json();
      if (response.ok && data.gameId) {
        setTestGameId(data.gameId);
        setError(`✅ Test game created: ${data.gameId}`);
      } else {
        setError('Failed to create test game');
      }
    } catch (err) {
      setError('Failed to create test game');
    } finally {
      setLoadingState('createGame', false);
    }
  };

  useEffect(() => {
    fetchHealthData();
  }, [fetchHealthData]);

  const StatusIndicator = ({ status }: { status: string }) => {
    const color = status === 'ok' || status === 'healthy' || status === 'ready' || status === 'valid' 
      ? 'text-green-600' 
      : status === 'degraded' || status === 'issues_detected'
      ? 'text-yellow-600'
      : 'text-red-600';
    
    return <span className={`font-bold ${color}`}>{status.toUpperCase()}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">Debug Dashboard</h1>
        <p className="text-gray-600 mb-8">
          This page provides internal debugging capabilities without requiring bash commands.
        </p>

        {error && (
          <div className={`mb-4 p-4 rounded-lg ${error.startsWith('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {error}
          </div>
        )}

        {/* Health Check Section */}
        <div className="bg-white rounded-lg p-6 shadow-lg mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">System Health</h2>
            <button
              onClick={fetchHealthData}
              disabled={loading.health}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
            >
              {loading.health ? 'Checking...' : 'Refresh Health'}
            </button>
          </div>

          {healthData && (
            <div>
              <div className="mb-4">
                <span className="font-semibold">Overall Status: </span>
                <StatusIndicator status={healthData.status} />
              </div>
              
              <div className="mb-4">
                <span className="font-semibold">Active Games: </span>
                <span className="font-mono">{healthData.gameStore.activeGames}</span>
                {healthData.gameStore.games.length > 0 && (
                  <div className="mt-2">
                    <span className="font-semibold">Game IDs: </span>
                    <div className="bg-gray-100 p-2 rounded text-sm font-mono">
                      {healthData.gameStore.games.join(', ')}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold mb-2">Endpoint Status:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {Object.entries(healthData.endpoints).map(([endpoint, data]) => (
                    <div key={endpoint} className="bg-gray-50 p-2 rounded">
                      <span className="font-mono text-sm">{endpoint}: </span>
                      <StatusIndicator status={data.status} />
                      {data.details && (
                        <div className="text-xs text-gray-600 mt-1">{data.details}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Game Management Section */}
        <div className="bg-white rounded-lg p-6 shadow-lg mb-6">
          <h2 className="text-2xl font-bold mb-4">Game Management</h2>
          
          <div className="flex gap-4 mb-4">
            <button
              onClick={createTestGame}
              disabled={loading.createGame}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
            >
              {loading.createGame ? 'Creating...' : 'Create Test Game'}
            </button>
            
            <div className="flex gap-2">
              <input
                type="text"
                value={testGameId}
                onChange={(e) => setTestGameId(e.target.value)}
                placeholder="Enter Game ID"
                className="px-3 py-2 border border-gray-300 rounded-md"
              />
              <button
                onClick={() => validateGame(testGameId)}
                disabled={loading.validate || !testGameId.trim()}
                className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
              >
                {loading.validate ? 'Validating...' : 'Validate Game'}
              </button>
            </div>
          </div>

          {gameValidationData && (
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-semibold mb-2">Game Validation Results:</h3>
              <div className="mb-2">
                <span className="font-semibold">Status: </span>
                <StatusIndicator status={gameValidationData.status} />
              </div>
              <div className="mb-2">
                <span className="font-semibold">Exists: </span>
                <span className={gameValidationData.exists ? 'text-green-600' : 'text-red-600'}>
                  {gameValidationData.exists ? 'YES' : 'NO'}
                </span>
              </div>
              
              {gameValidationData.issues.length > 0 && (
                <div className="mb-2">
                  <span className="font-semibold text-red-600">Issues:</span>
                  <ul className="list-disc list-inside text-red-600 ml-4">
                    {gameValidationData.issues.map((issue, i) => (
                      <li key={i} className="text-sm">{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {gameValidationData.recommendations.length > 0 && (
                <div className="mb-2">
                  <span className="font-semibold text-blue-600">Recommendations:</span>
                  <ul className="list-disc list-inside text-blue-600 ml-4">
                    {gameValidationData.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm">{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {Object.keys(gameValidationData.details).length > 0 && (
                <div>
                  <span className="font-semibold">Game Details:</span>
                  <pre className="bg-white p-2 rounded text-xs mt-1 overflow-auto">
                    {JSON.stringify(gameValidationData.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SSE Testing Section */}
        <div className="bg-white rounded-lg p-6 shadow-lg mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">SSE Testing</h2>
            <div className="flex gap-2">
              <button
                onClick={() => runSSETest()}
                disabled={loading.sse}
                className="bg-orange-500 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
              >
                {loading.sse ? 'Testing...' : 'Test SSE (New Game)'}
              </button>
              <button
                onClick={() => runSSETest(testGameId)}
                disabled={loading.sse || !testGameId.trim()}
                className="bg-orange-600 hover:bg-orange-800 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
              >
                {loading.sse ? 'Testing...' : 'Test SSE (Existing Game)'}
              </button>
            </div>
          </div>

          {sseTestData && (
            <div>
              <div className="mb-4">
                <span className="font-semibold">SSE Test Status: </span>
                <StatusIndicator status={sseTestData.status} />
              </div>
              
              <div className="mb-4">
                <span className="font-semibold">Test Game ID: </span>
                <span className="font-mono text-sm">{sseTestData.gameId}</span>
              </div>

              <div className="mb-4">
                <span className="font-semibold">Broadcaster Connections: </span>
                <span className="font-mono">{sseTestData.broadcaster.connectionCount}</span>
              </div>

              <div className="mb-4">
                <h3 className="font-semibold mb-2">Test Results:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {Object.entries(sseTestData.tests).map(([test, data]) => (
                    <div key={test} className="bg-gray-50 p-2 rounded">
                      <span className="font-mono text-sm">{test}: </span>
                      <StatusIndicator status={data.status} />
                      {data.details && (
                        <div className="text-xs text-gray-600 mt-1">{data.details}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {sseTestData.recommendations.length > 0 && (
                <div>
                  <span className="font-semibold text-blue-600">Recommendations:</span>
                  <ul className="list-disc list-inside text-blue-600 ml-4">
                    {sseTestData.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm">{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg p-6 shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link 
              href="/table" 
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded text-center block"
            >
              Go to Table UI
            </Link>
            <a 
              href="/deck" 
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-4 rounded text-center block"
            >
              Go to Deck UI
            </a>
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}