import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import './GameRoom.css';

function GameRoom() {
  const { id } = useParams();
  const [gameState, setGameState] = useState(null);
  const [betAmount, setBetAmount] = useState('');
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    newSocket.emit('joinGame', id);

    newSocket.on('gameStateUpdate', (updatedState) => {
      setGameState(updatedState);
    });

    return () => newSocket.close();
  }, [id]);

  const handleAction = (action) => {
    socket.emit('gameAction', {
      gameId: id,
      action: action,
      amount: action === 'raise' ? parseInt(betAmount) : undefined
    });
    setBetAmount('');
  };

  const handleBetChange = (e) => {
    setBetAmount(e.target.value);
  };

  const getPossibleActions = (player) => {
    const actions = [];
    if (player.bet < gameState.currentBet) {
      actions.push('fold');
      if (player.chips > gameState.currentBet - player.bet) {
        actions.push('call');
        actions.push('raise');
      }
    } else {
      actions.push('check');
      if (player.chips > 0) {
        actions.push('raise');
      }
    }
    return actions;
  };

  if (!gameState) {
    return <div>Loading game...</div>;
  }

  const currentPlayer = gameState.players.find(p => p.id === socket.id);

  return (
    <div className="game-room">
      <h2>Game Room {id}</h2>
      <div className="game-info">
        <p>Stage: {gameState.stage}</p>
        <p>Pot: ${gameState.pot}</p>
        <p>Current Bet: ${gameState.currentBet}</p>
      </div>
      <div className="community-cards">
        {gameState.communityCards.map((card, index) => (
          <div key={index} className="card">{card}</div>
        ))}
      </div>
      <div className="players">
        {gameState.players.map((player, index) => (
          <div key={index} className={`player ${player.id === gameState.players[gameState.currentPlayerIndex].id ? 'active' : ''}`}>
            <h3>{player.name} {player.id === gameState.players[gameState.dealerIndex].id ? '(D)' : ''}</h3>
            <p>Chips: ${player.chips}</p>
            <p>Bet: ${player.bet}</p>
            <div className="cards">
              {player.cards.map((card, cardIndex) => (
                <div key={cardIndex} className="card">{card}</div>
              ))}
            </div>
            {player.hand && <p>Hand: {player.hand.type}</p>}
          </div>
        ))}
      </div>
      {currentPlayer && currentPlayer.id === gameState.players[gameState.currentPlayerIndex].id && (
        <div className="player-actions">
          {getPossibleActions(currentPlayer).map(action => (
            <button key={action} onClick={() => handleAction(action)}>
              {action.charAt(0).toUpperCase() + action.slice(1)}
            </button>
          ))}
          {getPossibleActions(currentPlayer).includes('raise') && (
            <>
              <input 
                type="number" 
                value={betAmount} 
                onChange={handleBetChange} 
                placeholder="Raise amount"
              />
              <button onClick={() => handleAction('raise')}>Raise</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default GameRoom;