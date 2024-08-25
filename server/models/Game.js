const { sequelize, DataTypes } = require('../config/database');

const Game = sequelize.define('Game', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // Add other game properties here
});

module.exports = Game;