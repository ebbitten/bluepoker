const { sequelize, DataTypes } = require('../config/database');

const Game = sequelize.define('Game', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  status: {
    type: DataTypes.ENUM('waiting', 'playing', 'ended'),
    allowNull: false,
    defaultValue: 'waiting',
  },
  maxPlayers: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 9,
  },
  smallBlind: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10,  // Set a default value for smallBlind
  },
  bigBlind: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 20,  // It's common to have bigBlind as double the smallBlind
  },
});

module.exports = Game;