/**
 * Card playing logic
 */

import type { Card, BoardCell, PlayCardResult } from './types'

/**
 * Play a card to place a chip on the board
 */
export function playCard(
  card: Card,
  row: number,
  col: number,
  board: BoardCell[][]
): PlayCardResult {
  // TODO: Validate card can be played at this position
  // TODO: Check if position matches card suit/rank
  // TODO: Check if position is already occupied
  // TODO: Handle joker spaces
  
  return {
    success: false,
    error: 'Not implemented',
  }
}

/**
 * Check if a card can be played at a specific position
 */
export function canPlayCard(
  card: Card,
  row: number,
  col: number,
  board: BoardCell[][]
): boolean {
  // TODO: Check board layout matching
  // TODO: Check if cell is available
  // TODO: Check joker rules
  
  return false
}

