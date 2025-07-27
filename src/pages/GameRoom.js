import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';

function GameRoom() {
  const { id } = useParams();
  const [gameState, setGameState] = useState(null);
  const [betAmount, setBetAmount] = useState('');
  const [socket, setSocket] = useState(null);
  const [playerCount, setPlayerCount] = useState(0);

  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server, joining game:', id);
      newSocket.emit('joinGame', id);
    });

    newSocket.on('joinedGame', (gameState) => {
      console.log('Successfully joined game:', gameState);
      setGameState(gameState);
      setPlayerCount(gameState.players.length);
    });

    newSocket.on('playerJoined', ({ playerCount }) => {
      setPlayerCount(playerCount);
    });

    newSocket.on('gameReady', () => {
      console.log('Game is ready to start');
      // You might want to update UI to show a "Start Game" button here
    });

    newSocket.on('gameStarted', (updatedState) => {
      console.log('Game started:', updatedState);
      setGameState(updatedState);
    });

    newSocket.on('joinGameError', (error) => {
      console.error('Error joining game:', error);
      setGameState({ error });
    });

    newSocket.on('gameStateUpdate', (updatedState) => {
      console.log('Received game state update:', updatedState);
      setGameState(updatedState);
    });

    return () => newSocket.close();
  }, [id]);

  const handleAction = (action) => {
    if (socket) {
      socket.emit('gameAction', {
        gameId: id,
        action: action,
        amount: action === 'raise' ? parseInt(betAmount) : undefined
      });
      setBetAmount('');
    }
  };

  const handleBetChange = (e) => {
    setBetAmount(e.target.value);
  };

  const handleStartGame = () => {
    if (socket) {
      socket.emit('startGame', id);
    }
  };

  if (!gameState) {
    return <div>Loading game...</div>;
  }

  if (gameState.error) {
    return <div>Error: {gameState.error}</div>;
  }

  // Ensure gameState.players exists before trying to use it
  const players = gameState.players || [];
  const currentPlayer = socket ? players.find(p => p.id === socket.id) : null;

  return (
    <div className="game-room">
      <h2>Game Room {id}</h2>
      <p>Players: {playerCount}/{gameState.maxPlayers}</p>
      {gameState.status === 'ready' && (
        <button onClick={handleStartGame}>Start Game</button>
      )}
      <div className="game-info">
        <p>Stage: {gameState.stage || 'Not started'}</p>
        <p>Pot: ${gameState.pot || 0}</p>
        <p>Current Bet: ${gameState.currentBet || 0}</p>
      </div>
      <div className="community-cards">
        {(gameState.communityCards || []).map((card, index) => (
          <div key={index} className="card">{card}</div>
        ))}
      </div>
      <div className="players">
        {players.map((player, index) => (
          <div key={index} className={`player ${player.id === gameState.currentPlayerIndex ? 'active' : ''}`}>
            <h3>{player.name} {player.id === gameState.dealerIndex ? '(D)' : ''}</h3>
            <p>Chips: ${player.chips}</p>
            <p>Bet: ${player.bet}</p>
            <div className="cards">
              {(player.cards || []).map((card, cardIndex) => (
                <div key={cardIndex} className="card">{card}</div>
              ))}
            </div>
            {player.hand && <p>Hand: {player.hand.type}</p>}
          </div>
        ))}
      </div>
      {currentPlayer && currentPlayer.id === gameState.currentPlayerIndex && (
        <div className="player-actions">
          <button onClick={() => handleAction('fold')}>Fold</button>
          <button onClick={() => handleAction('call')}>Call</button>
          <button onClick={() => handleAction('check')}>Check</button>
          <input 
            type="number" 
            value={betAmount} 
            onChange={handleBetChange} 
            placeholder="Raise amount"
          />
          <button onClick={() => handleAction('raise')}>Raise</button>
        </div>
      )}
    </div>
  );
}

export default GameRoom;