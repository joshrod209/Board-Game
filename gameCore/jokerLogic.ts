/**
 * Joker logic for corner spaces
 * Jokers can: Add chip anywhere OR Remove chip (not from capped scores)
 */

import type { BoardCell, ChipColor, JokerAction, JokerResult } from './types'

/**
 * Use joker to add a chip anywhere on the board
 */
export function jokerAddChip(
  row: number,
  col: number,
  chipColor: ChipColor,
  board: BoardCell[][]
): JokerResult {
  // TODO: Validate position is valid
  // TODO: Check if position is available (not occupied, not capped unless same color)
  // TODO: Place chip
  
  if (board[row]?.[col]?.chip) {
    return {
      success: false,
      error: 'Position already occupied',
    }
  }
  
  if (board[row]?.[col]?.isCapped && board[row][col].chip !== chipColor) {
    return {
      success: false,
      error: 'Cannot place on capped score',
    }
  }
  
  return {
    success: true,
  }
}

/**
 * Use joker to remove a chip from the board
 */
export function jokerRemoveChip(
  row: number,
  col: number,
  board: BoardCell[][]
): JokerResult {
  // TODO: Validate position is valid
  // TODO: Check if position has a chip
  // TODO: Check if chip is in a capped score (cannot remove)
  // TODO: Remove chip
  
  if (!board[row]?.[col]?.chip) {
    return {
      success: false,
      error: 'No chip at this position',
    }
  }
  
  if (board[row][col].isCapped) {
    return {
      success: false,
      error: 'Cannot remove chip from capped score',
    }
  }
  
  return {
    success: true,
  }
}

