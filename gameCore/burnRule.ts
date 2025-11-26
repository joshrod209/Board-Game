/**
 * Burn rule implementation
 * Once per turn, if card is unplayable, can burn (discard + draw)
 */

import type { Card, Cell, BurnResult } from './types'
import { canPlayCard } from './playCard'
import { BOARD_SIZE } from './constants'

/**
 * Check if a card is playable anywhere on the board
 * Returns true if the card can be played on at least one valid position
 */
export function isCardPlayable(
  card: Card,
  board: Cell[][]
): boolean {
  // Handle wild cards
  if (card.wildCardType === 'twoEyedJack') {
    // Two-eyed jack: can be played on any unoccupied cell
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const cell = board[row]?.[col]
        if (cell && !cell.isCorner && (cell.chip === null || cell.chip === undefined)) {
          return true // Found at least one playable position
        }
      }
    }
    return false
  }
  
  if (card.wildCardType === 'oneEyedJack') {
    // One-eyed jack: can remove opponent's chips (we'll check opponent in play logic)
    // For burn check, if there are any chips on board, it might be playable
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const cell = board[row]?.[col]
        if (cell && !cell.isCorner && cell.chip !== null && cell.chip !== undefined && !cell.isCapped) {
          return true // Found at least one chip that could potentially be removed
        }
      }
    }
    return false
  }
  
  if (card.wildCardType === 'joker') {
    // Joker: can add chip OR remove opponent's chip
    // Check if there's at least one position for either action
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const cell = board[row]?.[col]
        if (cell && !cell.isCorner) {
          // Can add if empty, or can remove if has chip and not capped
          if ((cell.chip === null || cell.chip === undefined) || 
              (cell.chip !== null && !cell.isCapped)) {
            return true // Found at least one playable position
          }
        }
      }
    }
    return false
  }
  
  // Regular cards: check all positions on board
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (canPlayCard(card, row, col, board)) {
        return true // Found at least one playable position
      }
    }
  }
  
  return false // Card cannot be played anywhere
}

/**
 * Execute burn rule: discard unplayable card and draw new one
 * @param card - The card to burn
 * @param board - Current board state to validate card is unplayable
 * @param deck - Deck to draw new card from
 */
export function burnCard(
  card: Card,
  board: Cell[][],
  deck: { draw: () => Card | null }
): BurnResult {
  // Validate card is truly unplayable
  if (isCardPlayable(card, board)) {
    return {
      success: false,
      error: 'Card is playable and cannot be burned. Play the card instead.',
    }
  }
  
  // Draw new card from deck
  const newCard = deck.draw()
  
  if (!newCard) {
    return {
      success: false,
      error: 'Deck is empty - cannot draw new card',
    }
  }
  
  return {
    success: true,
    newCard,
  }
}

