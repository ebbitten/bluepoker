import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

function Lobby() {
  const [games, setGames] = useState([]);
  const [socket, setSocket] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsLoading(false);
    });

    newSocket.on('connect_error', (err) => {
      setError('Failed to connect to server');
      setIsLoading(false);
    });

    newSocket.on('gamesList', (gamesList) => {
      setGames(gamesList);
    });

    newSocket.emit('getGames');

    return () => newSocket.close();
  }, []);

  const createGame = useCallback(() => {
    if (socket) {
      socket.emit('createGame');
    }
  }, [socket]);

  const joinGame = useCallback((gameId) => {
    if (socket) {
      socket.emit('joinGame', gameId);
      navigate(`/game/${gameId}`);
    }
  }, [socket, navigate]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h2>Game Lobby</h2>
      <button onClick={createGame}>Create New Game</button>
      <ul>
        {games.map(game => (
          <li key={game.id}>
            Game {game.id} - Players: {game.players.length}/{game.maxPlayers}
            <button onClick={() => joinGame(game.id)}>Join Game</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Lobby;