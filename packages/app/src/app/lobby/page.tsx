'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface LobbyGame {
  gameId: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: string;
  players: Array<{
    id: string;
    name: string;
    isReady: boolean;
  }>;
  gameType: 'heads-up' | 'multi-table';
  buyIn?: number;
}

interface LobbyData {
  games: LobbyGame[];
  totalGames: number;
  activePlayers: number;
}

export default function LobbyPage() {
  const { user } = useAuth();
  const [lobbyData, setLobbyData] = useState<LobbyData>({ games: [], totalGames: 0, activePlayers: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [selectedGame, setSelectedGame] = useState<LobbyGame | null>(null);
  const router = useRouter();

  // Create game form state
  const [createForm, setCreateForm] = useState({
    name: '',
    maxPlayers: '4',
    gameType: 'multi-table' as 'heads-up' | 'multi-table',
    buyIn: ''
  });

  // Join game uses authenticated user's username directly

  // Fetch lobby data with authentication
  const fetchLobbyData = async () => {
    try {
      const response = await fetch('/api/lobby/games', {
        headers: {
          'Authorization': `Bearer ${user?.id}` // Include user ID for authentication
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch lobby data');
      }
      const data = await response.json();
      setLobbyData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Update join form when user changes - handled via useState initialization

  // Real-time SSE connection
  useEffect(() => {
    if (!user) return; // Don't fetch if not authenticated
    
    fetchLobbyData();

    // Set up SSE connection for real-time updates
    const eventSource = new EventSource('/api/lobby/events');
    
    eventSource.onopen = () => {
      console.log('Lobby SSE connection established');
    };

    eventSource.addEventListener('connected', (event) => {
      console.log('Lobby SSE connected:', JSON.parse(event.data));
    });

    eventSource.addEventListener('lobbyState', (event) => {
      const data = JSON.parse(event.data);
      console.log('Lobby state update:', data);
      setLobbyData(data);
    });

    eventSource.addEventListener('gameCreated', (event) => {
      console.log('Game created:', JSON.parse(event.data));
      fetchLobbyData(); // Refresh on game creation
    });

    eventSource.addEventListener('gameUpdated', (event) => {
      console.log('Game updated:', JSON.parse(event.data));
      fetchLobbyData(); // Refresh on game updates
    });

    eventSource.addEventListener('playerJoined', (event) => {
      console.log('Player joined:', JSON.parse(event.data));
      fetchLobbyData(); // Refresh when players join
    });

    eventSource.addEventListener('playerLeft', (event) => {
      console.log('Player left:', JSON.parse(event.data));
      fetchLobbyData(); // Refresh when players leave
    });

    eventSource.onerror = (error) => {
      console.error('Lobby SSE error:', error);
      // Don't set error state for SSE issues - just fall back to manual refresh
    };

    // Cleanup on unmount
    return () => {
      eventSource.close();
    };
  }, [user, fetchLobbyData]);

  // Create new game with authentication
  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/lobby/games', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.id}`
        },
        body: JSON.stringify({
          name: createForm.name,
          maxPlayers: parseInt(createForm.maxPlayers),
          gameType: createForm.gameType,
          buyIn: createForm.buyIn ? parseInt(createForm.buyIn) : undefined,
          createdBy: user?.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create game');
      }

      // Reset form and close dialog
      setCreateForm({ name: '', maxPlayers: '4', gameType: 'multi-table', buyIn: '' });
      setShowCreateDialog(false);
      
      // Refresh lobby data
      await fetchLobbyData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game');
    }
  };

  // Join existing game with authentication
  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedGame) return;

    try {
      const response = await fetch(`/api/lobby/games/${selectedGame.gameId}/join`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.id}`
        },
        body: JSON.stringify({
          playerName: user?.username,
          userId: user?.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to join game');
      }

      const result = await response.json();
      
      // Navigate to the game table with player ID
      router.push(`/table/${selectedGame.gameId}?playerId=${result.playerId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join game');
    }
  };

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'waiting': return <Badge variant="secondary">Waiting</Badge>;
      case 'playing': return <Badge variant="default">Playing</Badge>;
      case 'finished': return <Badge variant="outline">Finished</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  // Get game type badge
  const getGameTypeBadge = (gameType: string) => {
    return gameType === 'heads-up' ? 
      <Badge variant="outline">Heads-Up</Badge> : 
      <Badge variant="outline">Multi-Table</Badge>;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading lobby...</div>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Game Lobby</h1>
          <p className="text-muted-foreground">
            Welcome, {user?.username} • {lobbyData.totalGames} games • {lobbyData.activePlayers} active players
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/table">
            <Button variant="outline">Single Table</Button>
          </Link>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger>
              <Button>Create Game</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Game</DialogTitle>
                <DialogDescription>
                  Set up a new poker game for other players to join.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateGame} className="space-y-4">
                <div>
                  <Label htmlFor="gameName">Game Name</Label>
                  <Input
                    id="gameName"
                    name="gameName"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="Enter game name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="maxPlayers">Max Players</Label>
                  <Select
                    name="maxPlayers"
                    value={createForm.maxPlayers}
                    onValueChange={(value) => setCreateForm({ ...createForm, maxPlayers: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 Players</SelectItem>
                      <SelectItem value="4">4 Players</SelectItem>
                      <SelectItem value="6">6 Players</SelectItem>
                      <SelectItem value="8">8 Players</SelectItem>
                      <SelectItem value="10">10 Players</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="gameType">Game Type</Label>
                  <Select
                    name="gameType"
                    value={createForm.gameType}
                    onValueChange={(value) => 
                      setCreateForm({ ...createForm, gameType: value as 'heads-up' | 'multi-table' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="heads-up">Heads-Up</SelectItem>
                      <SelectItem value="multi-table">Multi-Table</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="buyIn">Buy-In (optional)</Label>
                  <Input
                    id="buyIn"
                    name="buyIn"
                    type="number"
                    value={createForm.buyIn}
                    onChange={(e) => setCreateForm({ ...createForm, buyIn: e.target.value })}
                    placeholder="Enter buy-in amount"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Game</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setError(null)}
            className="mt-2"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Games List */}
      <div className="space-y-4">
        {lobbyData.games.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                <p className="text-lg mb-2">No games available</p>
                <p>Create a new game to get started!</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          lobbyData.games.map((game) => (
            <Card key={game.gameId} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{game.name}</CardTitle>
                    <CardDescription>
                      Created {new Date(game.createdAt).toLocaleString()}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {getStatusBadge(game.status)}
                    {getGameTypeBadge(game.gameType)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Players:</span> {game.playerCount}/{game.maxPlayers}
                    </div>
                    {game.buyIn && (
                      <div>
                        <span className="font-medium">Buy-in:</span> ${game.buyIn}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    {game.status === 'waiting' && game.playerCount < game.maxPlayers ? (
                      <Dialog open={showJoinDialog && selectedGame?.gameId === game.gameId} 
                              onOpenChange={(open) => {
                                setShowJoinDialog(open);
                                if (open) setSelectedGame(game);
                              }}>
                        <DialogTrigger>
                          <Button>Join</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Join {game.name}</DialogTitle>
                            <DialogDescription>
                              Join this game with your authenticated account.
                            </DialogDescription>
                          </DialogHeader>
                          <form onSubmit={handleJoinGame} className="space-y-4">
                            <div>
                              <Label>Playing as</Label>
                              <div className="p-2 bg-gray-50 rounded border">
                                <span className="font-medium">{user?.username}</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                You will join this game with your authenticated username
                              </p>
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => setShowJoinDialog(false)}
                              >
                                Cancel
                              </Button>
                              <Button type="submit">Join Game</Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                    ) : game.status === 'waiting' ? (
                      <Button disabled>Full</Button>
                    ) : (
                      <Button variant="outline" disabled>
                        {game.status === 'playing' ? 'In Progress' : 'Finished'}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Player List */}
                {game.players.length > 0 && (
                  <>
                    <Separator className="my-3" />
                    <div>
                      <h4 className="text-sm font-medium mb-2">Players:</h4>
                      <div className="flex flex-wrap gap-2">
                        {game.players.map((player) => (
                          <Badge key={player.id} variant="secondary">
                            {player.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Refresh Button */}
      <div className="mt-6 text-center">
        <Button variant="outline" onClick={fetchLobbyData}>
          Refresh Lobby
        </Button>
      </div>
      </div>
    </ProtectedRoute>
  );
}