import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import io from 'socket.io-client';

function Lobby({ socket: propSocket, isAuthenticated }) {
  const [games, setGames] = useState([]);
  const [socket, setSocket] = useState(propSocket);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const navigateToGame = useCallback((gameId) => {
    navigate(`/game/${gameId}`);
  }, [navigate]);

  useEffect(() => {
    let newSocket;
    if (!socket && isAuthenticated) {
      newSocket = io('http://localhost:5000');
      setSocket(newSocket);
    }

    if (newSocket || socket) {
      const currentSocket = newSocket || socket;
      
      currentSocket.on('connect', () => {
        setIsLoading(false);
        currentSocket.emit('getGames');
      });

      currentSocket.on('connect_error', (err) => {
        setError('Failed to connect to server');
        setIsLoading(false);
      });

      currentSocket.on('gamesList', (gamesList) => {
        setGames(gamesList);
        setIsLoading(false);
      });

      currentSocket.on('gameCreated', (gameId) => {
        console.log('New game created:', gameId);
        currentSocket.emit('getGames');
      });

      currentSocket.on('joinedGame', (game) => {
        console.log('Successfully joined game:', game);
        navigateToGame(game.id);
      });

      currentSocket.on('joinGameError', (error) => {
        console.error('Error joining game:', error);
        setError(error);
      });
    } else {
      setIsLoading(false);
    }

    return () => {
      if (newSocket) newSocket.close();
    };
  }, [socket, isAuthenticated, navigateToGame]);

  const createGame = useCallback(() => {
    if (socket) {
      socket.emit('createGame');
    }
  }, [socket]);

  const joinGame = useCallback((gameId) => {
    if (socket) {
      console.log('Attempting to join game:', gameId);
      socket.emit('joinGame', gameId);
    }
  }, [socket]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h2>Game Lobby</h2>
      {isAuthenticated ? (
        <>
          <button onClick={createGame}>Create New Game</button>
          <ul>
            {games.map(game => (
              <li key={game.id}>
                Game {game.id} - Status: {game.status} - Max Players: {game.maxPlayers}
                <button onClick={() => joinGame(game.id)}>Join Game</button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <Link to="/auth">Login to create or join games</Link>
      )}
    </div>
  );
}

export default Lobby;