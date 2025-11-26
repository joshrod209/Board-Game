/**
 * Board layout for Quad Sequence game
 * 10×10 grid with complete card layout
 * Row 5 is the equator where cards flip orientation
 */

import type { Cell } from './types'
import { BOARD_SIZE } from './constants'

/**
 * 10×10 board array with actual card layout
 * Row and column indices are 0-based
 */
export const boardLayout: Cell[][] = [
  // Row 1 (Row 0 in code) - Top row
  [
    { id: 'cell-0-0', row: 0, col: 0, rank: 'Joker', suit: 'joker', isCorner: true, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-0-1', row: 0, col: 1, rank: '9', suit: 'clubs', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-0-2', row: 0, col: 2, rank: '8', suit: 'hearts', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-0-3', row: 0, col: 3, rank: '7', suit: 'spades', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-0-4', row: 0, col: 4, rank: '6', suit: 'diamonds', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-0-5', row: 0, col: 5, rank: '5', suit: 'clubs', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-0-6', row: 0, col: 6, rank: '4', suit: 'hearts', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-0-7', row: 0, col: 7, rank: '3', suit: 'spades', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-0-8', row: 0, col: 8, rank: '2', suit: 'diamonds', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-0-9', row: 0, col: 9, rank: 'Joker', suit: 'joker', isCorner: true, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
  ],
  // Row 2 (Row 1 in code)
  [
    { id: 'cell-1-0', row: 1, col: 0, rank: '10', suit: 'spades', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-1-1', row: 1, col: 1, rank: '9', suit: 'diamonds', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-1-2', row: 1, col: 2, rank: '8', suit: 'clubs', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-1-3', row: 1, col: 3, rank: '7', suit: 'hearts', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-1-4', row: 1, col: 4, rank: '6', suit: 'spades', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-1-5', row: 1, col: 5, rank: '5', suit: 'diamonds', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-1-6', row: 1, col: 6, rank: '4', suit: 'clubs', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-1-7', row: 1, col: 7, rank: '3', suit: 'hearts', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-1-8', row: 1, col: 8, rank: '2', suit: 'spades', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-1-9', row: 1, col: 9, rank: 'A', suit: 'diamonds', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
  ],
  // Row 3 (Row 2 in code)
  [
    { id: 'cell-2-0', row: 2, col: 0, rank: '10', suit: 'diamonds', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-2-1', row: 2, col: 1, rank: '9', suit: 'spades', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-2-2', row: 2, col: 2, rank: '8', suit: 'diamonds', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-2-3', row: 2, col: 3, rank: '7', suit: 'clubs', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-2-4', row: 2, col: 4, rank: '6', suit: 'hearts', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-2-5', row: 2, col: 5, rank: '5', suit: 'spades', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-2-6', row: 2, col: 6, rank: '4', suit: 'diamonds', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-2-7', row: 2, col: 7, rank: '3', suit: 'clubs', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-2-8', row: 2, col: 8, rank: '2', suit: 'hearts', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-2-9', row: 2, col: 9, rank: 'A', suit: 'clubs', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
  ],
  // Row 4 (Row 3 in code)
  [
    { id: 'cell-3-0', row: 3, col: 0, rank: '10', suit: 'clubs', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-3-1', row: 3, col: 1, rank: '9', suit: 'hearts', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-3-2', row: 3, col: 2, rank: '8', suit: 'spades', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-3-3', row: 3, col: 3, rank: '7', suit: 'diamonds', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-3-4', row: 3, col: 4, rank: '6', suit: 'clubs', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-3-5', row: 3, col: 5, rank: '5', suit: 'hearts', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-3-6', row: 3, col: 6, rank: '4', suit: 'spades', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-3-7', row: 3, col: 7, rank: '3', suit: 'diamonds', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-3-8', row: 3, col: 8, rank: '2', suit: 'clubs', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-3-9', row: 3, col: 9, rank: 'A', suit: 'hearts', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
  ],
  // Row 5 (Row 4 in code) - EQUATOR: cards flip orientation here
  [
    { id: 'cell-4-0', row: 4, col: 0, rank: '10', suit: 'hearts', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-4-1', row: 4, col: 1, rank: 'K', suit: 'clubs', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-4-2', row: 4, col: 2, rank: 'Q', suit: 'diamonds', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-4-3', row: 4, col: 3, rank: 'K', suit: 'spades', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-4-4', row: 4, col: 4, rank: 'Q', suit: 'hearts', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-4-5', row: 4, col: 5, rank: 'Q', suit: 'clubs', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-4-6', row: 4, col: 6, rank: 'K', suit: 'diamonds', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-4-7', row: 4, col: 7, rank: 'Q', suit: 'spades', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-4-8', row: 4, col: 8, rank: 'K', suit: 'hearts', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-4-9', row: 4, col: 9, rank: 'A', suit: 'spades', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
  ],
  // Row 6 (Row 5 in code)
  [
    { id: 'cell-5-0', row: 5, col: 0, rank: 'A', suit: 'clubs', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-5-1', row: 5, col: 1, rank: 'K', suit: 'hearts', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-5-2', row: 5, col: 2, rank: 'Q', suit: 'clubs', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-5-3', row: 5, col: 3, rank: 'K', suit: 'diamonds', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-5-4', row: 5, col: 4, rank: 'Q', suit: 'spades', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-5-5', row: 5, col: 5, rank: 'Q', suit: 'diamonds', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-5-6', row: 5, col: 6, rank: 'K', suit: 'clubs', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-5-7', row: 5, col: 7, rank: 'Q', suit: 'hearts', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-5-8', row: 5, col: 8, rank: 'K', suit: 'spades', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-5-9', row: 5, col: 9, rank: '10', suit: 'diamonds', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
  ],
  // Row 7 (Row 6 in code)
  [
    { id: 'cell-6-0', row: 6, col: 0, rank: 'A', suit: 'diamonds', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-6-1', row: 6, col: 1, rank: '2', suit: 'spades', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-6-2', row: 6, col: 2, rank: '3', suit: 'hearts', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-6-3', row: 6, col: 3, rank: '4', suit: 'clubs', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-6-4', row: 6, col: 4, rank: '5', suit: 'diamonds', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-6-5', row: 6, col: 5, rank: '6', suit: 'spades', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-6-6', row: 6, col: 6, rank: '7', suit: 'hearts', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-6-7', row: 6, col: 7, rank: '8', suit: 'clubs', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-6-8', row: 6, col: 8, rank: '9', suit: 'diamonds', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-6-9', row: 6, col: 9, rank: '10', suit: 'clubs', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
  ],
  // Row 8 (Row 7 in code)
  [
    { id: 'cell-7-0', row: 7, col: 0, rank: 'A', suit: 'spades', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-7-1', row: 7, col: 1, rank: '2', suit: 'diamonds', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-7-2', row: 7, col: 2, rank: '3', suit: 'spades', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-7-3', row: 7, col: 3, rank: '4', suit: 'hearts', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-7-4', row: 7, col: 4, rank: '5', suit: 'clubs', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-7-5', row: 7, col: 5, rank: '6', suit: 'diamonds', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-7-6', row: 7, col: 6, rank: '7', suit: 'spades', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-7-7', row: 7, col: 7, rank: '8', suit: 'hearts', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-7-8', row: 7, col: 8, rank: '9', suit: 'clubs', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-7-9', row: 7, col: 9, rank: '10', suit: 'hearts', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
  ],
  // Row 9 (Row 8 in code)
  [
    { id: 'cell-8-0', row: 8, col: 0, rank: 'A', suit: 'hearts', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-8-1', row: 8, col: 1, rank: '2', suit: 'clubs', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-8-2', row: 8, col: 2, rank: '3', suit: 'diamonds', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-8-3', row: 8, col: 3, rank: '4', suit: 'spades', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-8-4', row: 8, col: 4, rank: '5', suit: 'hearts', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-8-5', row: 8, col: 5, rank: '6', suit: 'clubs', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-8-6', row: 8, col: 6, rank: '7', suit: 'diamonds', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-8-7', row: 8, col: 7, rank: '8', suit: 'spades', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-8-8', row: 8, col: 8, rank: '9', suit: 'hearts', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-8-9', row: 8, col: 9, rank: '10', suit: 'spades', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
  ],
  // Row 10 (Row 9 in code) - Bottom row
  [
    { id: 'cell-9-0', row: 9, col: 0, rank: 'Joker', suit: 'joker', isCorner: true, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-9-1', row: 9, col: 1, rank: '2', suit: 'hearts', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-9-2', row: 9, col: 2, rank: '3', suit: 'clubs', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-9-3', row: 9, col: 3, rank: '4', suit: 'diamonds', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-9-4', row: 9, col: 4, rank: '5', suit: 'spades', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-9-5', row: 9, col: 5, rank: '6', suit: 'hearts', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-9-6', row: 9, col: 6, rank: '7', suit: 'clubs', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-9-7', row: 9, col: 7, rank: '8', suit: 'diamonds', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-9-8', row: 9, col: 8, rank: '9', suit: 'spades', isCorner: false, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
    { id: 'cell-9-9', row: 9, col: 9, rank: 'Joker', suit: 'joker', isCorner: true, isRoyalBelt: false, chip: null, isCapped: false, scoreIds: [] },
  ],
]
