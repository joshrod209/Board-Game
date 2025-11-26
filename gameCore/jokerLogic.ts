/**
 * Wild card logic for special playing cards
 * - Two-eyed jack: Place chip anywhere (unoccupied)
 * - One-eyed jack: Remove opponent's uncapped chip
 * - Joker: Add your chip OR remove opponent's chip (not capped)
 */

import type { Cell, ChipColor, JokerResult } from './types'
import { BOARD_SIZE } from './constants'

/**
 * Use two-eyed jack or joker to add a chip anywhere on the board
 */
export function wildCardAddChip(
  row: number,
  col: number,
  chipColor: ChipColor,
  board: Cell[][]
): JokerResult {
  // Validate bounds
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
  
  // Cannot place on joker corner spaces
  if (cell.isCorner) {
    return {
      success: false,
      error: 'Cannot place chip on joker corner spaces',
    }
  }
  
  // Cannot place on occupied cells
  if (cell.chip !== null && cell.chip !== undefined) {
    return {
      success: false,
      error: 'Position already occupied',
    }
  }
  
  // Cannot place on capped scores (unless same color, but that's unlikely with wild cards)
  if (cell.isCapped && cell.chip !== chipColor) {
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
 * Use one-eyed jack or joker to remove an opponent's chip from the board
 */
export function wildCardRemoveChip(
  row: number,
  col: number,
  opponentColor: ChipColor,
  board: Cell[][]
): JokerResult {
  // Validate bounds
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
  
  // Cannot remove from joker corner spaces
  if (cell.isCorner) {
    return {
      success: false,
      error: 'Cannot remove chip from joker corner spaces',
    }
  }
  
  // Must have a chip to remove
  if (!cell.chip || cell.chip === null) {
    return {
      success: false,
      error: 'No chip at this position',
    }
  }
  
  // Can only remove opponent's chips
  if (cell.chip !== opponentColor) {
    return {
      success: false,
      error: 'Can only remove opponent\'s chips',
    }
  }
  
  // Cannot remove from capped scores
  if (cell.isCapped) {
    return {
      success: false,
      error: 'Cannot remove chip from capped score',
    }
  }
  
  return {
    success: true,
  }
}
