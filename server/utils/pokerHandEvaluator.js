const RANKS = '23456789TJQKA';
const SUITS = '♠♥♦♣';

function evaluateHand(holeCards, communityCards) {
    const allCards = [...holeCards, ...communityCards];
    const flush = checkFlush(allCards);
    const straight = checkStraight(allCards);
    const groups = groupCards(allCards);

    if (flush && straight && straight[0] === 'A') return { type: 'Royal Flush', value: 10 };
    if (flush && straight) return { type: 'Straight Flush', value: 9, highCard: straight[0] };
    if (groups[0].length === 4) return { type: 'Four of a Kind', value: 8, quad: groups[0][0], kicker: groups[1][0] };
    if (groups[0].length === 3 && groups[1].length === 2) return { type: 'Full House', value: 7, triple: groups[0][0], pair: groups[1][0] };
    if (flush) return { type: 'Flush', value: 6, cards: flush };
    if (straight) return { type: 'Straight', value: 5, highCard: straight[0] };
    if (groups[0].length === 3) return { type: 'Three of a Kind', value: 4, triple: groups[0][0], kickers: [groups[1][0], groups[2][0]] };
    if (groups[0].length === 2 && groups[1].length === 2) return { type: 'Two Pair', value: 3, highPair: groups[0][0], lowPair: groups[1][0], kicker: groups[2][0] };
    if (groups[0].length === 2) return { type: 'One Pair', value: 2, pair: groups[0][0], kickers: [groups[1][0], groups[2][0], groups[3][0]] };
    return { type: 'High Card', value: 1, cards: groups.flat().slice(0, 5) };
}

function checkFlush(cards) {
    const suits = cards.map(card => card[1]);
    const flushSuit = SUITS.split('').find(suit => suits.filter(s => s === suit).length >= 5);
    if (flushSuit) {
        return cards.filter(card => card[1] === flushSuit)
            .sort((a, b) => RANKS.indexOf(b[0]) - RANKS.indexOf(a[0]))
            .slice(0, 5)
            .map(card => card[0]);
    }
    return null;
}

function checkStraight(cards) {
    const ranks = [...new Set(cards.map(card => card[0]))].sort((a, b) => RANKS.indexOf(b) - RANKS.indexOf(a));
    const aceIndex = ranks.indexOf('A');
    if (aceIndex !== -1) ranks.push('A'); // Add Ace to the end for A-5 straight
    
    for (let i = 0; i < ranks.length - 4; i++) {
        const straight = ranks.slice(i, i + 5);
        if (isStraight(straight)) return straight;
    }
    return null;
}

function isStraight(ranks) {
    for (let i = 1; i < ranks.length; i++) {
        if (RANKS.indexOf(ranks[i-1]) - RANKS.indexOf(ranks[i]) !== 1) return false;
    }
    return true;
}

function groupCards(cards) {
    const groups = {};
    cards.forEach(card => {
        groups[card[0]] = (groups[card[0]] || []).concat(card);
    });
    return Object.values(groups).sort((a, b) => b.length - a.length || RANKS.indexOf(b[0][0]) - RANKS.indexOf(a[0][0]));
}

function compareHands(hand1, hand2) {
    if (hand1.value !== hand2.value) return hand1.value - hand2.value;
    
    // Implement tiebreakers for each hand type
    switch (hand1.type) {
        case 'Straight Flush':
        case 'Straight':
            return RANKS.indexOf(hand1.highCard) - RANKS.indexOf(hand2.highCard);
        case 'Four of a Kind':
            if (hand1.quad !== hand2.quad) return RANKS.indexOf(hand1.quad) - RANKS.indexOf(hand2.quad);
            return RANKS.indexOf(hand1.kicker) - RANKS.indexOf(hand2.kicker);
        case 'Full House':
            if (hand1.triple !== hand2.triple) return RANKS.indexOf(hand1.triple) - RANKS.indexOf(hand2.triple);
            return RANKS.indexOf(hand1.pair) - RANKS.indexOf(hand2.pair);
        case 'Flush':
        case 'High Card':
            for (let i = 0; i < hand1.cards.length; i++) {
                const diff = RANKS.indexOf(hand1.cards[i]) - RANKS.indexOf(hand2.cards[i]);
                if (diff !== 0) return diff;
            }
            return 0;
        case 'Three of a Kind':
            if (hand1.triple !== hand2.triple) return RANKS.indexOf(hand1.triple) - RANKS.indexOf(hand2.triple);
            for (let i = 0; i < hand1.kickers.length; i++) {
                const diff = RANKS.indexOf(hand1.kickers[i]) - RANKS.indexOf(hand2.kickers[i]);
                if (diff !== 0) return diff;
            }
            return 0;
        case 'Two Pair':
            if (hand1.highPair !== hand2.highPair) return RANKS.indexOf(hand1.highPair) - RANKS.indexOf(hand2.highPair);
            if (hand1.lowPair !== hand2.lowPair) return RANKS.indexOf(hand1.lowPair) - RANKS.indexOf(hand2.lowPair);
            return RANKS.indexOf(hand1.kicker) - RANKS.indexOf(hand2.kicker);
        case 'One Pair':
            if (hand1.pair !== hand2.pair) return RANKS.indexOf(hand1.pair) - RANKS.indexOf(hand2.pair);
            for (let i = 0; i < hand1.kickers.length; i++) {
                const diff = RANKS.indexOf(hand1.kickers[i]) - RANKS.indexOf(hand2.kickers[i]);
                if (diff !== 0) return diff;
            }
            return 0;
    }
}

module.exports = { evaluateHand, compareHands };
