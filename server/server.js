const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { sequelize } = require('./config/database');
const GameLogic = require('./models/GameLogic');

// Import routers
const authRouter = require('./routes/auth');
const gameRouter = require('./routes/game');

const app = express();
app.use(cors());
app.use(express.json());

// Use routers
app.use('/api/auth', authRouter);
app.use('/api/game', gameRouter);

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

const games = new Map();

// Sync database
sequelize.sync()
  .then(() => console.log('Database synced'))
  .catch(err => console.error('Error syncing database:', err));

// Socket.io logic
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('getGames', () => {
    const gamesList = Array.from(games.values()).map(game => ({
      id: game.id,
      players: game.players.length,
      maxPlayers: game.maxPlayers,
      status: game.status
    }));
    socket.emit('gamesList', gamesList);
  });

  socket.on('createGame', () => {
    const gameId = Date.now().toString();
    const newGame = new GameLogic(gameId);
    games.set(gameId, newGame);
    socket.emit('gameCreated', gameId);
    io.emit('gamesList', Array.from(games.values()).map(game => ({
      id: game.id,
      players: game.players.length,
      maxPlayers: game.maxPlayers,
      status: game.status
    })));
  });

  socket.on('joinGame', (gameId) => {
    const game = games.get(gameId);
    if (game && game.players.length < game.maxPlayers) {
      const player = {
        id: socket.id,
        name: `Player ${game.players.length + 1}`,
        chips: 1000,
        currentBet: 0,
        folded: false,
        allIn: false
      };
      if (game.addPlayer(player)) {
        socket.join(gameId);
        socket.emit('joinedGame', game.getPublicGameState(socket.id));
        io.to(gameId).emit('playerJoined', player);
        if (game.players.length >= 2 && game.status === 'waiting') {
          game.startGame();
          io.to(gameId).emit('gameStarted', game.getPublicGameState(null));
        }
      } else {
        socket.emit('joinGameError', 'Game is full');
      }
    } else {
      socket.emit('joinGameError', 'Unable to join game');
    }
  });

  socket.on('gameAction', ({ gameId, action, amount }) => {
    const game = games.get(gameId);
    if (game) {
      const playerIndex = game.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1 && playerIndex === game.currentPlayerIndex) {
        try {
          game.handleAction(playerIndex, action, amount);
          io.to(gameId).emit('gameStateUpdate', game.getPublicGameState(null));
          if (game.status === 'ended') {
            // Handle game end, maybe start a new round
            games.delete(gameId);
            io.to(gameId).emit('gameEnded', game.getPublicGameState(null));
          }
        } catch (error) {
          socket.emit('gameActionError', error.message);
        }
      } else {
        socket.emit('gameActionError', 'Not your turn');
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    for (let [gameId, game] of games) {
      if (game.removePlayer(socket.id)) {
        io.to(gameId).emit('playerLeft', socket.id);
        if (game.players.length === 0) {
          games.delete(gameId);
        } else if (game.status !== 'waiting' && game.getActivePlayers().length < 2) {
          game.status = 'ended';
          io.to(gameId).emit('gameEnded', game.getPublicGameState(null));
          games.delete(gameId);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
sequelize.sync({ force: false })
  .then(() => {
    console.log('Database synced');
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error('Unable to sync database:', err));