import { NextRequest, NextResponse } from 'next/server';
import { createDeck, shuffleDeck, ShuffleResponse } from '@bluepoker/shared';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seedParam = searchParams.get('seed');
    
    // Parse seed or default to current timestamp
    let seed: number;
    if (seedParam !== null && !isNaN(Number(seedParam))) {
      seed = Number(seedParam);
    } else {
      seed = Date.now();
    }
    
    // Create and shuffle deck
    const deck = createDeck();
    const shuffledDeck = shuffleDeck(deck, seed);
    
    const response: ShuffleResponse = {
      deck: shuffledDeck,
      seed,
      timestamp: Date.now()
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error shuffling deck:', error);
    return NextResponse.json(
      { error: 'Failed to shuffle deck' },
      { status: 500 }
    );
  }
}