const { sequelize, User } = require('../config/database');
const { DataTypes } = require('sequelize');
const { evaluateHand, compareHands } = require('../utils/pokerHandEvaluator');

const Game = sequelize.define('Game', {
  maxPlayers: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 9 // Standard Texas Hold'em table size
  },
  smallBlind: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  bigBlind: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('waiting', 'preflop', 'flop', 'turn', 'river', 'showdown', 'finished'),
    defaultValue: 'waiting'
  },
  pot: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  currentTurn: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  dealerPosition: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  deck: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  communityCards: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  currentBet: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  }
});

// Define the PlayerGame model for the many-to-many relationship
const PlayerGame = sequelize.define('PlayerGame', {
  position: DataTypes.INTEGER,
  chips: DataTypes.FLOAT,
  bet: DataTypes.FLOAT,
  folded: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  holeCards: DataTypes.JSON,
  hand: DataTypes.JSON // Added to store evaluated hand information
});

// Set up associations
Game.belongsToMany(User, { through: PlayerGame, as: 'players' });
User.belongsToMany(Game, { through: PlayerGame });

sequelize.sync()
  .then(() => {
    console.log('Game and PlayerGame tables created or already exist.');
  })
  .catch(err => {
    console.error('Error syncing Game and PlayerGame tables:', err);
  });

const gameController = {
    createGame: async (req, res) => {
        try {
            const { smallBlind, bigBlind } = req.body;
            const newGame = await Game.create({
                smallBlind,
                bigBlind,
                status: 'waiting',
                pot: 0,
                currentTurn: 0,
                dealerPosition: 0,
                deck: [],
                communityCards: []
            });
            res.status(201).json({ message: "Game created successfully", gameId: newGame.id });
        } catch (error) {
            res.status(500).json({ message: "Error creating game", error: error.message });
        }
    },

    getGame: async (req, res) => {
        try {
            const game = await Game.findByPk(req.params.id, {
                include: [{ 
                    model: User, 
                    as: 'players', 
                    attributes: ['id', 'username'],
                    through: { attributes: ['position', 'chips', 'bet', 'folded', 'hand'] }
                }]
            });
            if (!game) {
                return res.status(404).json({ message: "Game not found" });
            }
            res.status(200).json({ message: "Game retrieved successfully", game });
        } catch (error) {
            res.status(500).json({ message: "Error retrieving game", error: error.message });
        }
    },

    joinGame: async (req, res) => {
        try {
            const game = await Game.findByPk(req.params.id, {
                include: [{ model: User, as: 'players' }]
            });
            if (!game) {
                return res.status(404).json({ message: "Game not found" });
            }
            if (game.players.length >= game.maxPlayers) {
                return res.status(400).json({ message: "Game is full" });
            }
            if (game.status !== 'waiting') {
                return res.status(400).json({ message: "Game has already started" });
            }
            
            await game.addPlayer(req.user.id, { 
                through: { 
                    position: game.players.length,
                    chips: game.bigBlind * 100, // Start with 100 big blinds
                    bet: 0,
                    folded: false,
                    holeCards: []
                }
            });

            if (game.players.length + 1 >= 2) { // Minimum 2 players to start
                game.status = 'preflop';
                // Implement game start logic here (e.g., deal cards, set blinds)
                await startNewHand(game);
            }
            
            await game.save();
            res.status(200).json({ message: "Joined game successfully" });
        } catch (error) {
            res.status(500).json({ message: "Error joining game", error: error.message });
        }
    },

    makeMove: async (req, res) => {
        try {
            const { action, amount } = req.body;
            const game = await Game.findByPk(req.params.id, {
                include: [{ 
                    model: User, 
                    as: 'players',
                    through: { attributes: ['position', 'chips', 'bet', 'folded', 'hand'] }
                }]
            });
            if (!game) {
                return res.status(404).json({ message: "Game not found" });
            }
            if (game.status === 'waiting' || game.status === 'finished') {
                return res.status(400).json({ message: "Game is not in progress" });
            }
            
            const playerIndex = game.players.findIndex(p => p.id === req.user.id);
            if (playerIndex !== game.currentTurn) {
                return res.status(400).json({ message: "It's not your turn" });
            }

            const player = game.players[playerIndex];
            const playerGame = player.PlayerGame;

            switch (action) {
                case 'fold':
                    playerGame.folded = true;
                    break;
                case 'check':
                    if (game.currentBet > playerGame.bet) {
                        return res.status(400).json({ message: "Cannot check, must call or raise" });
                    }
                    break;
                case 'call':
                    const callAmount = game.currentBet - playerGame.bet;
                    if (callAmount > playerGame.chips) {
                        return res.status(400).json({ message: "Not enough chips to call" });
                    }
                    playerGame.chips -= callAmount;
                    playerGame.bet += callAmount;
                    game.pot += callAmount;
                    break;
                case 'raise':
                    if (amount <= game.currentBet || amount > playerGame.chips) {
                        return res.status(400).json({ message: "Invalid raise amount" });
                    }
                    const raiseAmount = amount - playerGame.bet;
                    playerGame.chips -= raiseAmount;
                    playerGame.bet += raiseAmount;
                    game.pot += raiseAmount;
                    game.currentBet = amount;
                    break;
                default:
                    return res.status(400).json({ message: "Invalid action" });
            }

            await playerGame.save();

            // Move to next player or next stage
            await moveToNextTurnOrStage(game);

            await game.save();

            res.status(200).json({ message: "Move made successfully" });
        } catch (error) {
            res.status(500).json({ message: "Error making move", error: error.message });
        }
    }
};

async function startNewHand(game) {
    // Reset game state
    game.pot = 0;
    game.currentBet = 0;
    game.communityCards = [];
    game.deck = createShuffledDeck();

    // Move dealer button
    game.dealerPosition = (game.dealerPosition + 1) % game.players.length;

    // Set blinds
    const smallBlindPos = (game.dealerPosition + 1) % game.players.length;
    const bigBlindPos = (game.dealerPosition + 2) % game.players.length;

    game.players[smallBlindPos].PlayerGame.bet = game.smallBlind;
    game.players[smallBlindPos].PlayerGame.chips -= game.smallBlind;
    game.players[bigBlindPos].PlayerGame.bet = game.bigBlind;
    game.players[bigBlindPos].PlayerGame.chips -= game.bigBlind;

    game.pot = game.smallBlind + game.bigBlind;
    game.currentBet = game.bigBlind;

    // Deal hole cards
    for (let player of game.players) {
        player.PlayerGame.holeCards = [game.deck.pop(), game.deck.pop()];
        player.PlayerGame.folded = false;
        await player.PlayerGame.save();
    }

    // Set first to act
    game.currentTurn = (game.dealerPosition + 3) % game.players.length;
}

async function moveToNextTurnOrStage(game) {
    const activePlayers = game.players.filter(p => !p.PlayerGame.folded);
    
    if (activePlayers.length === 1) {
        // Hand is over, award pot to last player
        await endHand(game, activePlayers[0]);
        return;
    }

    do {
        game.currentTurn = (game.currentTurn + 1) % game.players.length;
    } while (game.players[game.currentTurn].PlayerGame.folded);

    const allPlayersCalled = game.players.every(p => 
        p.PlayerGame.folded || p.PlayerGame.bet === game.currentBet
    );

    if (allPlayersCalled) {
        switch (game.status) {
            case 'preflop':
                game.status = 'flop';
                game.communityCards = [game.deck.pop(), game.deck.pop(), game.deck.pop()];
                break;
            case 'flop':
                game.status = 'turn';
                game.communityCards.push(game.deck.pop());
                break;
            case 'turn':
                game.status = 'river';
                game.communityCards.push(game.deck.pop());
                break;
            case 'river':
                game.status = 'showdown';
                await endHand(game);
                return;
        }
        game.currentBet = 0;
        for (let player of game.players) {
            player.PlayerGame.bet = 0;
            await player.PlayerGame.save();
        }
        game.currentTurn = (game.dealerPosition + 1) % game.players.length;
    }
}

async function endHand(game) {
    const activePlayers = game.players.filter(p => !p.PlayerGame.folded);
    
    if (activePlayers.length === 1) {
        // If only one player is left, they win
        const winner = activePlayers[0];
        winner.PlayerGame.chips += game.pot;
    } else {
        // Evaluate hands of all active players
        const playerHands = activePlayers.map(player => ({
            player: player,
            hand: evaluateHand(player.PlayerGame.holeCards, game.communityCards)
        }));

        // Sort hands from best to worst
        playerHands.sort((a, b) => compareHands(b.hand, a.hand));

        // Determine winner(s)
        const winners = playerHands.filter(ph => compareHands(ph.hand, playerHands[0].hand) === 0);

        // Split pot among winners
        const winAmount = Math.floor(game.pot / winners.length);
        for (let winner of winners) {
            winner.player.PlayerGame.chips += winAmount;
            await winner.player.PlayerGame.save();
        }
    }

    game.pot = 0;
    game.status = 'finished';
    await game.save();
}

function createShuffledDeck() {
    const suits = ['♠', '♥', '♦', '♣'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    let deck = suits.flatMap(suit => values.map(value => value + suit));
    return shuffle(deck);
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

module.exports = gameController;