import { NextRequest, NextResponse } from 'next/server';
import { drawCards, DrawRequest, DrawResponse } from '@bluepoker/shared';

export async function POST(request: NextRequest) {
  try {
    const body: DrawRequest = await request.json();
    
    // Validate request body
    if (!body || typeof body.count !== 'number' || !Array.isArray(body.deck)) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected { count: number, deck: Card[] }' },
        { status: 400 }
      );
    }
    
    const { count, deck } = body;
    
    // Validate count
    if (count < 1) {
      return NextResponse.json(
        { error: 'Count must be at least 1' },
        { status: 400 }
      );
    }
    
    if (count > deck.length) {
      return NextResponse.json(
        { error: `Cannot draw ${count} cards from deck with ${deck.length} cards` },
        { status: 400 }
      );
    }
    
    // Handle empty deck
    if (deck.length === 0) {
      const response: DrawResponse = {
        drawnCards: [],
        remainingDeck: [],
        count: 0
      };
      return NextResponse.json(response);
    }
    
    // Draw cards
    const { drawnCards, remainingDeck } = drawCards(deck, count);
    
    const response: DrawResponse = {
      drawnCards,
      remainingDeck,
      count: drawnCards.length
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error drawing cards:', error);
    
    if (error instanceof Error && error.message.includes('Invalid count')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to draw cards' },
      { status: 500 }
    );
  }
}