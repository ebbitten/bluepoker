import { NextRequest, NextResponse } from 'next/server';
import { evaluateHand, HandEvalResult } from '@bluepoker/shared';

interface HandEvalRequest {
  cards: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: HandEvalRequest = await request.json();
    
    // Validate request body
    if (!body || !Array.isArray(body.cards)) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected { cards: string[] }' },
        { status: 400 }
      );
    }
    
    const { cards } = body;
    
    // Validate card count
    if (cards.length < 5 || cards.length > 7) {
      return NextResponse.json(
        { error: `Invalid number of cards: ${cards.length}. Must be 5-7 cards.` },
        { status: 400 }
      );
    }
    
    // Validate card array is not empty and contains valid strings
    if (cards.some(card => typeof card !== 'string' || card.length === 0)) {
      return NextResponse.json(
        { error: 'Invalid card format. All cards must be non-empty strings.' },
        { status: 400 }
      );
    }
    
    // Evaluate the hand
    const result: HandEvalResult = evaluateHand(cards);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error evaluating hand:', error);
    
    // Handle specific validation errors from evaluateHand
    if (error instanceof Error) {
      if (error.message.includes('Invalid number of cards') ||
          error.message.includes('Invalid card format') ||
          error.message.includes('Duplicate cards')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }
    
    // Generic server error
    return NextResponse.json(
      { error: 'Failed to evaluate hand' },
      { status: 500 }
    );
  }
}