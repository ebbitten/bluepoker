const Deck = require('./Deck'); // We'll create this next

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
    // Implement showdown logic here
    // Compare hands, determine winner(s), distribute pot
    this.status = 'ended';
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
