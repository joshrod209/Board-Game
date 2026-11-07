/**
 * Shared test helpers for gameCore tests
 */

import type { Cell, ChipColor } from '../types'
import { boardLayout } from '../boardLayout'

/**
 * Create a fresh, mutable copy of the board (no chips placed)
 */
export function makeBoard(): Cell[][] {
  return boardLayout.map(row =>
    row.map(cell => ({
      ...cell,
      chip: null,
      isCapped: false,
      scoreIds: [],
    }))
  )
}

/**
 * Place a chip on the board (optionally capped)
 */
export function placeChip(
  board: Cell[][],
  row: number,
  col: number,
  color: ChipColor,
  isCapped = false
): void {
  board[row][col].chip = color
  board[row][col].isCapped = isCapped
}
