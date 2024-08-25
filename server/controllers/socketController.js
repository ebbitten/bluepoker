const Game = require('../models/Game');

exports.handleGameAction = async (io, data) => {
  const { gameId, action, player, betAmount } = data;
  
  try {
    const game = await Game.findByPk(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    // Update game state based on the action
    switch (action) {
      case 'fold':
        // Handle fold action
        break;
      case 'check':
        // Handle check action
        break;
      case 'call':
        // Handle call action
        break;
      case 'raise':
        // Handle raise action
        break;
      default:
        throw new Error('Invalid action');
    }

    // Save the updated game state
    await game.save();

    // Broadcast the updated game state to all players
    io.to(gameId).emit('gameStateUpdate', game);
  } catch (error) {
    console.error('Error handling game action:', error);
    // You might want to emit an error event to the client here
  }
};
