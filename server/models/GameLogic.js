const Deck = require('./Deck'); // We'll create this next
const pokerHandEvaluator = require('../utils/pokerHandEvaluator');

class GameLogic {
  constructor(id, maxPlayers = 9, smallBlind = 10, bigBlind = 20) {
    this.id = id;
    this.players = [];
    this.maxPlayers = maxPlayers;
    this.smallBlind = smallBlind;
    this.bigBlind = bigBlind;
    this.deck = new Deck();
    this.communityCards = [];
    this.pot = 0;
    this.currentPlayerIndex = 0;
    this.dealerIndex = 0;
    this.smallBlindIndex = 1;
    this.bigBlindIndex = 2;
    this.status = 'waiting';
    this.currentBet = 0;
    this.lastRaiseIndex = -1;
  }

  addPlayer(player) {
    if (this.players.length < this.maxPlayers) {
      this.players.push(player);
      return true;
    }
    return false;
  }

  removePlayer(playerId) {
    const index = this.players.findIndex(p => p.id === playerId);
    if (index !== -1) {
      this.players.splice(index, 1);
      return true;
    }
    return false;
  }

  startGame() {
    if (this.players.length < 2) return false;
    this.status = 'preflop';
    this.deck.shuffle();
    this.dealPlayerCards();
    this.postBlinds();
    return true;
  }

  dealPlayerCards() {
    this.players.forEach(player => {
      player.cards = [this.deck.drawCard(), this.deck.drawCard()];
    });
  }

  postBlinds() {
    const smallBlindPlayer = this.players[this.smallBlindIndex % this.players.length];
    const bigBlindPlayer = this.players[this.bigBlindIndex % this.players.length];
    smallBlindPlayer.bet(this.smallBlind);
    bigBlindPlayer.bet(this.bigBlind);
    this.currentBet = this.bigBlind;
    this.pot = this.smallBlind + this.bigBlind;
  }

  handleAction(playerIndex, action, amount = 0) {
    const player = this.players[playerIndex];
    switch (action) {
      case 'fold':
        player.folded = true;
        break;
      case 'call':
        this.pot += this.currentBet - player.currentBet;
        player.bet(this.currentBet - player.currentBet);
        break;
      case 'raise':
        if (amount <= this.currentBet) throw new Error('Raise amount must be greater than current bet');
        this.pot += amount - player.currentBet;
        player.bet(amount - player.currentBet);
        this.currentBet = amount;
        this.lastRaiseIndex = playerIndex;
        break;
      default:
        throw new Error('Invalid action');
    }
    this.moveToNextPlayer();
  }

  moveToNextPlayer() {
    do {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    } while (this.players[this.currentPlayerIndex].folded || this.players[this.currentPlayerIndex].allIn);

    if (this.currentPlayerIndex === this.lastRaiseIndex || this.getActivePlayers().length === 1) {
      this.moveToNextStage();
    }
  }

  moveToNextStage() {
    switch (this.status) {
      case 'preflop':
        this.status = 'flop';
        this.dealCommunityCards(3);
        break;
      case 'flop':
        this.status = 'turn';
        this.dealCommunityCards(1);
        break;
      case 'turn':
        this.status = 'river';
        this.dealCommunityCards(1);
        break;
      case 'river':
        this.status = 'showdown';
        this.handleShowdown();
        break;
      default:
        throw new Error('Invalid game status');
    }
    this.resetBettingRound();
  }

  dealCommunityCards(count) {
    for (let i = 0; i < count; i++) {
      this.communityCards.push(this.deck.drawCard());
    }
  }

  resetBettingRound() {
    this.currentBet = 0;
    this.lastRaiseIndex = -1;
    this.players.forEach(player => player.currentBet = 0);
    this.currentPlayerIndex = (this.dealerIndex + 1) % this.players.length;
  }

  handleShowdown() {
    const activePlayersWithHands = this.players.filter(player => !player.folded);
    const winningPlayers = this.determineWinners(activePlayersWithHands);
    this.distributePot(winningPlayers);
    this.status = 'ended';
  }

  determineWinners(players) {
    const playerHands = players.map(player => ({
      player,
      hand: [...player.cards, ...this.communityCards],
      handRank: pokerHandEvaluator.evaluateHand([...player.cards, ...this.communityCards])
    }));

    playerHands.sort((a, b) => b.handRank - a.handRank);
    const highestRank = playerHands[0].handRank;

    return playerHands
      .filter(ph => ph.handRank === highestRank)
      .map(ph => ph.player);
  }

  distributePot(winners) {
    const winAmount = Math.floor(this.pot / winners.length);
    winners.forEach(winner => {
      winner.chips += winAmount;
    });
    this.pot = 0;
  }

  prepareNextRound() {
    this.communityCards = [];
    this.pot = 0;
    this.currentBet = 0;
    this.lastRaiseIndex = -1;
    this.deck = new Deck();
    this.deck.shuffle();

    // Move dealer button
    this.dealerIndex = (this.dealerIndex + 1) % this.players.length;
    this.smallBlindIndex = (this.dealerIndex + 1) % this.players.length;
    this.bigBlindIndex = (this.dealerIndex + 2) % this.players.length;

    // Reset player states
    this.players.forEach(player => {
      player.folded = false;
      player.allIn = false;
      player.currentBet = 0;
      player.cards = [];
    });

    // Remove players with no chips
    this.players = this.players.filter(player => player.chips > 0);

    if (this.players.length >= 2) {
      this.startGame();
    } else {
      this.status = 'waiting';
    }
  }

  isRoundComplete() {
    const activePlayers = this.getActivePlayers();
    return activePlayers.length === 1 || 
           (this.currentPlayerIndex === this.lastRaiseIndex && 
            activePlayers.every(player => player.currentBet === this.currentBet));
  }

  getActivePlayers() {
    return this.players.filter(player => !player.folded && !player.allIn);
  }

  getPublicGameState(playerId) {
    return {
      id: this.id,
      players: this.players.map(player => ({
        id: player.id,
        name: player.name,
        chips: player.chips,
        bet: player.currentBet,
        folded: player.folded,
        allIn: player.allIn,
        cards: player.id === playerId ? player.cards : null
      })),
      communityCards: this.communityCards,
      pot: this.pot,
      currentPlayerIndex: this.currentPlayerIndex,
      dealerIndex: this.dealerIndex,
      smallBlindIndex: this.smallBlindIndex,
      bigBlindIndex: this.bigBlindIndex,
      status: this.status,
      currentBet: this.currentBet
    };
  }
}

module.exports = GameLogic;