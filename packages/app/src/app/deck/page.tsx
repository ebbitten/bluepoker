'use client';

import { useState } from 'react';
import { Card, ShuffleResponse, DrawResponse } from '@bluepoker/shared';

export default function DeckPage() {
  const [deck, setDeck] = useState<Card[]>([]);
  const [drawnCards, setDrawnCards] = useState<Card[]>([]);
  const [shuffleSeed, setShuffleSeed] = useState<string>('');
  const [drawCount, setDrawCount] = useState<number>(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleShuffle = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const seed = shuffleSeed || Date.now().toString();
      const response = await fetch(`/api/deck/shuffle?seed=${seed}`);
      
      if (!response.ok) {
        throw new Error('Failed to shuffle deck');
      }
      
      const data: ShuffleResponse = await response.json();
      setDeck(data.deck);
      setDrawnCards([]); // Clear drawn cards when shuffling
      setShuffleSeed(data.seed.toString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to shuffle deck');
    } finally {
      setLoading(false);
    }
  };

  const handleDraw = async () => {
    if (deck.length === 0) {
      setError('No deck available. Please shuffle first.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/deck/draw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          count: drawCount,
          deck: deck
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to draw cards');
      }
      
      const data: DrawResponse = await response.json();
      setDrawnCards(data.drawnCards);
      setDeck(data.remainingDeck);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to draw cards');
    } finally {
      setLoading(false);
    }
  };

  const renderCard = (card: Card, index: number) => {
    const suitSymbols: Record<Card['suit'], string> = {
      hearts: '♥',
      diamonds: '♦',
      clubs: '♣',
      spades: '♠'
    };
    
    const suitColors: Record<Card['suit'], string> = {
      hearts: 'text-red-500',
      diamonds: 'text-red-500',
      clubs: 'text-black',
      spades: 'text-black'
    };

    return (
      <div
        key={`${card.suit}-${card.rank}-${index}`}
        className="w-16 h-24 bg-white border-2 border-gray-300 rounded-lg flex flex-col items-center justify-between p-1 shadow-md"
      >
        <div className={`text-xs font-bold ${suitColors[card.suit]}`}>
          {card.rank}
        </div>
        <div className={`text-2xl ${suitColors[card.suit]}`}>
          {suitSymbols[card.suit]}
        </div>
        <div className={`text-xs font-bold ${suitColors[card.suit]} rotate-180`}>
          {card.rank}
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center mb-8">Deck Testing Harness</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Controls */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Shuffle Deck</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="seed" className="block text-sm font-medium text-gray-700 mb-1">
                  Seed (optional)
                </label>
                <input
                  id="seed"
                  type="text"
                  value={shuffleSeed}
                  onChange={(e) => setShuffleSeed(e.target.value)}
                  placeholder="Leave empty for random"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleShuffle}
                disabled={loading}
                className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Shuffling...' : 'Shuffle'}
              </button>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Draw Cards</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="count" className="block text-sm font-medium text-gray-700 mb-1">
                  Number of cards to draw
                </label>
                <input
                  id="count"
                  type="number"
                  value={drawCount}
                  onChange={(e) => setDrawCount(Number(e.target.value))}
                  min="1"
                  max={deck.length}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleDraw}
                disabled={loading || deck.length === 0}
                className="w-full bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Drawing...' : 'Draw Cards'}
              </button>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Deck Status</h2>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-medium">Cards in deck:</span> {deck.length}
              </p>
              <p className="text-sm">
                <span className="font-medium">Cards drawn:</span> {drawnCards.length}
              </p>
              <p className="text-sm">
                <span className="font-medium">Current seed:</span> {shuffleSeed || 'Not shuffled'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Card Display */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Drawn Cards</h2>
            {drawnCards.length > 0 ? (
              <div className="grid grid-cols-5 gap-2">
                {drawnCards.map(renderCard)}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No cards drawn yet</p>
            )}
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Remaining Deck Preview</h2>
            {deck.length > 0 ? (
              <div className="grid grid-cols-10 gap-1">
                {deck.slice(0, 20).map(renderCard)}
                {deck.length > 20 && (
                  <div className="w-16 h-24 bg-gray-100 border-2 border-gray-300 rounded-lg flex items-center justify-center text-xs text-gray-500">
                    +{deck.length - 20} more
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No deck available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}