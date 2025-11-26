/**
 * Card playing logic
 */

import type { Card, Cell, PlayCardResult } from './types'
import { BOARD_SIZE } from './constants'

/**
 * Check if a card can be played at a specific position
 */
export function canPlayCard(
  card: Card,
  row: number,
  col: number,
  board: Cell[][]
): boolean {
  // Validate board bounds
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
    return false
  }
  
  const cell = board[row]?.[col]
  if (!cell) {
    return false
  }
  
  // Cannot play on joker corner spaces (they're wildcard spaces, not playable positions)
  if (cell.isCorner) {
    return false
  }
  
  // Handle wild cards: two-eyed jack, one-eyed jack, and joker
  if (card.wildCardType === 'twoEyedJack') {
    // Two-eyed jack: can place chip on any unoccupied cell (not corner jokers)
    // Already checked cell.isCorner above, so if we get here, cell is valid
    // Must be unoccupied
    if (cell.chip !== null && cell.chip !== undefined) {
      return false
    }
    return true
  }
  
  if (card.wildCardType === 'oneEyedJack') {
    // One-eyed jack: can remove opponent's chip from any cell (not corner jokers)
    // Must have an opponent's chip (we'll check if it's opponent's in the play logic)
    if (cell.chip === null || cell.chip === undefined) {
      return false // No chip to remove
    }
    // Cannot remove from capped scores - this will be checked in play logic
    return true
  }
  
  if (card.wildCardType === 'joker') {
    // Joker: can add chip OR remove opponent's chip
    // For validation, we accept either empty cells or cells with chips
    // The actual action (add/remove) will be chosen by player
    return true
  }
  
  // Cannot play on cells that already have chips (for regular cards)
  if (cell.chip !== null && cell.chip !== undefined) {
    return false
  }
  
  // Regular cards: must match rank and suit exactly
  // Note: card.rank is type Rank ('2'|'3'|...|'A'), cell.rank is type string ('2'|'3'|...|'Joker')
  // String comparison works for matching ranks
  const rankMatches = card.rank === cell.rank
  const suitMatches = card.suit === cell.suit
  
  return rankMatches && suitMatches
}

/**
 * Play a card to place a chip on the board
 */
export function playCard(
  card: Card,
  row: number,
  col: number,
  board: Cell[][]
): PlayCardResult {
  // Validate board bounds
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
    return {
      success: false,
      error: 'Position is out of bounds',
    }
  }
  
  const cell = board[row]?.[col]
  if (!cell) {
    return {
      success: false,
      error: 'Invalid cell position',
    }
  }
  
  // Use canPlayCard to validate
  if (!canPlayCard(card, row, col, board)) {
    // Provide specific error messages
    if (cell.isCorner) {
      return {
        success: false,
        error: 'Cannot play on joker corner spaces',
      }
    }
    
    if (cell.chip !== null && cell.chip !== undefined) {
      return {
        success: false,
        error: 'Cell already has a chip',
      }
    }
    
    // Check if card matches (if not a wild card)
    if (!card.wildCardType) {
      const rankMatches = card.rank === cell.rank
      const suitMatches = card.suit === cell.suit
      
      if (!rankMatches || !suitMatches) {
        return {
          success: false,
          error: `Card ${card.rank} of ${card.suit} does not match cell ${cell.rank} of ${cell.suit}`,
        }
      }
    }
    
    return {
      success: false,
      error: 'Card cannot be played at this position',
    }
  }
  
  // Validation passed
  return {
    success: true,
  }
}

