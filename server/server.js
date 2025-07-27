const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sequelize, User } = require('./config/database');
const GameLogic = require('./models/GameLogic');
const Game = require('./models/Game');

// Import routers
const authRouter = require('./routes/auth');
const gameRouter = require('./routes/game');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'your_jwt_secret'; // In a real app, use an environment variable

// User registration
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hashedPassword });
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Registration failed' });
  }
});

// User login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid password' });
    }
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    res.status(400).json({ error: 'Login failed' });
  }
});

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

// Remove this line
// const games = new Map();

// Sync database
sequelize.sync()
  .then(() => console.log('Database synced'))
  .catch(err => console.error('Error syncing database:', err));

// Socket.io logic
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('authenticate', (token) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.id;
      socket.username = decoded.username;
      socket.emit('authenticated');
    } catch (error) {
      socket.emit('authentication_error', 'Invalid token');
    }
  });

  socket.on('getGames', async () => {
    const games = await Game.findAll({
      where: { status: 'waiting' },
      attributes: ['id', 'status', 'maxPlayers']
    });
    socket.emit('gamesList', games);
  });

  socket.on('createGame', async () => {
    try {
      const newGame = await Game.create({
        id: Date.now().toString(),
        status: 'waiting',
        maxPlayers: 9,
        smallBlind: 10,
        bigBlind: 20,
      });
      console.log(`New game created with ID: ${newGame.id}`);
      socket.emit('gameCreated', newGame.id);
      const games = await Game.findAll({ 
        where: { status: 'waiting' }, 
        attributes: ['id', 'status', 'maxPlayers'] 
      });
      io.emit('gamesList', games);
    } catch (error) {
      console.error('Error creating game:', error);
      socket.emit('gameCreationError', 'Failed to create game');
    }
  });

  socket.on('joinGame', async (gameId) => {
    console.log(`Attempt to join game: ${gameId}`);
    const game = await Game.findByPk(gameId);
    if (game && game.status === 'waiting') {
      let gameLogic = new GameLogic(game.id, game.maxPlayers);
      gameLogic.addPlayer({
        id: socket.id,
        name: `Player ${gameLogic.players.length + 1}`,
        chips: 1000,
        bet: 0,
        folded: false,
        allIn: false
      });
      
      await game.update({ 
        players: JSON.stringify(gameLogic.players),
        status: gameLogic.players.length >= 2 ? 'ready' : 'waiting'
      });

      socket.join(gameId);
      console.log(`Player ${socket.id} joined game ${gameId}`);
      
      io.to(gameId).emit('playerJoined', { 
        id: socket.id, 
        playerCount: gameLogic.players.length 
      });
      
      socket.emit('joinedGame', gameLogic.getPublicGameState());

      if (gameLogic.players.length >= 2) {
        io.to(gameId).emit('gameReady');
      }
    } else {
      console.log(`Game ${gameId} not found or not in waiting state`);
      socket.emit('joinGameError', 'Game not found or not in waiting state');
    }
  });

  socket.on('startGame', async (gameId) => {
    const game = await Game.findByPk(gameId);
    if (game && game.status === 'ready') {
      let gameLogic = new GameLogic(game.id, game.maxPlayers);
      gameLogic.players = JSON.parse(game.players);
      gameLogic.startGame();
      
      await game.update({ 
        status: 'playing',
        players: JSON.stringify(gameLogic.players)
      });

      io.to(gameId).emit('gameStarted', gameLogic.getPublicGameState());
    } else {
      socket.emit('startGameError', 'Game not found or not ready to start');
    }
  });

  socket.on('gameAction', async ({ gameId, action, amount }) => {
    const game = await Game.findByPk(gameId);
    if (game) {
      const gameLogic = new GameLogic(game.id, game.maxPlayers);
      // We need to populate gameLogic with the current game state
      // This part depends on how you're storing the game state in the database
      
      const playerIndex = gameLogic.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1 && playerIndex === gameLogic.currentPlayerIndex) {
        try {
          gameLogic.handleAction(playerIndex, action, amount);
          // Update the game state in the database
          game.status = gameLogic.status;
          // Add other properties that need to be updated
          await game.save();
          
          io.to(gameId).emit('gameStateUpdate', gameLogic.getPublicGameState(null));
          if (gameLogic.status === 'ended') {
            // Handle game end, maybe start a new round
            await game.destroy();
            io.to(gameId).emit('gameEnded', gameLogic.getPublicGameState(null));
          }
        } catch (error) {
          socket.emit('gameActionError', error.message);
        }
      } else {
        socket.emit('gameActionError', 'Not your turn');
      }
    } else {
      socket.emit('gameActionError', 'Game not found');
    }
  });

  socket.on('disconnect', async () => {
    console.log('Client disconnected');
    // Handle player disconnection logic here
  });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await sequelize.sync({ alter: true });
    console.log('Database synced and altered if necessary');
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error('Unable to sync database:', err);
  }
}

startServer();