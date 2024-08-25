const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '..', 'poker.db'),
  logging: console.log
});

// Test the connection
sequelize.authenticate()
  .then(() => {
    console.log('Connected to the SQLite database.');
  })
  .catch(err => {
    console.error('Error connecting to the database:', err);
  });

// Define the User model
const User = sequelize.define('User', {
  username: {
    type: Sequelize.STRING,
    unique: true,
    allowNull: false
  },
  password: {
    type: Sequelize.STRING,
    allowNull: false
  },
  credits: {
    type: Sequelize.INTEGER,
    defaultValue: 1000
  }
});

// Sync the model with the database
sequelize.sync()
  .then(() => {
    console.log('Database synced. User table created or already exists.');
  })
  .catch(err => {
    console.error('Error syncing database:', err);
  });

module.exports = {
  sequelize,
  DataTypes,
  User
};