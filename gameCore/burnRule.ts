/**
 * Burn rule implementation
 * Once per turn, if card is unplayable, can burn (discard + draw)
 */

import type { Card, BoardCell, BurnResult } from './types'

/**
 * Check if a card is playable anywhere on the board
 */
export function isCardPlayable(
  card: Card,
  board: BoardCell[][]
): boolean {
  // TODO: Check all positions on board
  // TODO: Check if any matching position is available (not occupied, not capped unless same color)
  // TODO: Account for joker spaces
  
  return false
}

/**
 * Execute burn rule: discard unplayable card and draw new one
 */
export function burnCard(
  card: Card,
  deck: { draw: () => Card | null }
): BurnResult {
  // TODO: Validate card is truly unplayable
  // TODO: Draw new card from deck
  // TODO: Return new card or error
  
  const newCard = deck.draw()
  
  if (!newCard) {
    return {
      success: false,
      error: 'Deck is empty',
    }
  }
  
  return {
    success: true,
    newCard,
  }
}

