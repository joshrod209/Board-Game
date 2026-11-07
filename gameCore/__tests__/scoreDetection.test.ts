/**
 * Score detection, consecutive line validation, capped chip rules, win condition
 */

import { describe, it, expect } from 'vitest'
import type { Score } from '../types'
import {
  detectScores,
  validateConsecutiveLine,
  validateCappedChipsInScore,
  checkWinCondition,
} from '../scoreDetection'
import { makeBoard, placeChip } from './helpers'

function makeScore(
  cells: Array<{ row: number; col: number }>,
  color: Score['color'],
  direction: Score['direction'],
  isCapped = false
): Score {
  return { id: `test-${direction}-${cells[0].row}-${cells[0].col}`, cells, color, direction, isCapped }
}

describe('detectScores', () => {
  it('finds no scores on an empty board', () => {
    const board = makeBoard()
    expect(detectScores(board, 'red')).toHaveLength(0)
    expect(detectScores(board, 'blue')).toHaveLength(0)
  })

  it('detects a horizontal score of 5 chips', () => {
    const board = makeBoard()
    for (let col = 2; col <= 6; col++) placeChip(board, 2, col, 'red')
    const scores = detectScores(board, 'red')
    expect(scores).toHaveLength(1)
    expect(scores[0].direction).toBe('horizontal')
    expect(detectScores(board, 'blue')).toHaveLength(0)
  })

  it('detects a vertical score of 5 chips', () => {
    const board = makeBoard()
    for (let row = 3; row <= 7; row++) placeChip(board, row, 5, 'blue')
    const scores = detectScores(board, 'blue')
    expect(scores).toHaveLength(1)
    expect(scores[0].direction).toBe('vertical')
  })

  it('detects a diagonal score of 5 chips', () => {
    const board = makeBoard()
    for (let i = 0; i < 5; i++) placeChip(board, 2 + i, 3 + i, 'red')
    const scores = detectScores(board, 'red')
    expect(scores).toHaveLength(1)
    expect(scores[0].direction).toBe('diagonal')
  })

  it('counts a corner joker as the 5th position (4 chips + corner)', () => {
    const board = makeBoard()
    // (0,0) is a corner joker; chips at (0,1)-(0,4) complete the line
    for (let col = 1; col <= 4; col++) placeChip(board, 0, col, 'red')
    const scores = detectScores(board, 'red')
    expect(scores).toHaveLength(1)
    expect(scores[0].cells).toContainEqual({ row: 0, col: 0 })
  })

  it('does not score 4 chips without a corner', () => {
    const board = makeBoard()
    for (let col = 2; col <= 5; col++) placeChip(board, 2, col, 'red')
    expect(detectScores(board, 'red')).toHaveLength(0)
  })
})

describe('validateConsecutiveLine', () => {
  it('accepts 5 consecutive same-color chips in a row', () => {
    const board = makeBoard()
    const cells = []
    for (let col = 2; col <= 6; col++) {
      placeChip(board, 2, col, 'red')
      cells.push({ row: 2, col })
    }
    const score = validateConsecutiveLine(cells, board, 'red')
    expect(score).not.toBeNull()
    expect(score!.direction).toBe('horizontal')
  })

  it('rejects non-consecutive cells', () => {
    const board = makeBoard()
    const cells = [
      { row: 2, col: 2 },
      { row: 2, col: 3 },
      { row: 2, col: 5 }, // gap at col 4
      { row: 2, col: 6 },
      { row: 2, col: 7 },
    ]
    cells.forEach(({ row, col }) => placeChip(board, row, col, 'red'))
    expect(validateConsecutiveLine(cells, board, 'red')).toBeNull()
  })

  it('rejects a line containing an opponent chip', () => {
    const board = makeBoard()
    const cells = []
    for (let col = 2; col <= 6; col++) {
      placeChip(board, 2, col, col === 4 ? 'blue' : 'red')
      cells.push({ row: 2, col })
    }
    expect(validateConsecutiveLine(cells, board, 'red')).toBeNull()
  })
})

describe('validateCappedChipsInScore', () => {
  /**
   * Set up a board with a capped red horizontal score at row 1, cols 0-4
   */
  function setupCappedRow(board: ReturnType<typeof makeBoard>): Score {
    for (let col = 0; col <= 4; col++) placeChip(board, 1, col, 'red', true)
    const cells = [0, 1, 2, 3, 4].map(col => ({ row: 1, col }))
    return makeScore(cells, 'red', 'horizontal', true)
  }

  it('allows a new score reusing 1 capped chip + 4 uncapped chips', () => {
    const board = makeBoard()
    const cappedScore = setupCappedRow(board)
    // Vertical line through the capped chip at (1,2)
    for (let row = 2; row <= 5; row++) placeChip(board, row, 2, 'red')
    const newScore = makeScore(
      [1, 2, 3, 4, 5].map(row => ({ row, col: 2 })),
      'red',
      'vertical'
    )
    expect(validateCappedChipsInScore(newScore, board, [cappedScore])).toBe(true)
  })

  it('rejects a new score using 2 capped chips from the same score', () => {
    const board = makeBoard()
    const cappedScore = setupCappedRow(board)
    // Horizontal extension: (1,3) and (1,4) are capped from the same score
    for (let col = 5; col <= 7; col++) placeChip(board, 1, col, 'red')
    const newScore = makeScore(
      [3, 4, 5, 6, 7].map(col => ({ row: 1, col })),
      'red',
      'horizontal'
    )
    expect(validateCappedChipsInScore(newScore, board, [cappedScore])).toBe(false)
  })

  it('allows 2 capped chips when they come from different scores', () => {
    const board = makeBoard()
    const cappedScoreA = setupCappedRow(board)
    // Second capped red score at row 3, cols 0-4
    for (let col = 0; col <= 4; col++) placeChip(board, 3, col, 'red', true)
    const cappedScoreB = makeScore(
      [0, 1, 2, 3, 4].map(col => ({ row: 3, col })),
      'red',
      'horizontal',
      true
    )
    // Vertical line at col 0: capped chips from A (1,0) and B (3,0) + 3 uncapped
    placeChip(board, 2, 0, 'red')
    placeChip(board, 4, 0, 'red')
    placeChip(board, 5, 0, 'red')
    const newScore = makeScore(
      [1, 2, 3, 4, 5].map(row => ({ row, col: 0 })),
      'red',
      'vertical'
    )
    expect(validateCappedChipsInScore(newScore, board, [cappedScoreA, cappedScoreB])).toBe(true)
  })

  it('rejects more than 2 capped chips', () => {
    const board = makeBoard()
    const cappedScore = setupCappedRow(board)
    // (1,1)-(1,4) capped + uncapped at (1,5): 4 capped chips in the line
    placeChip(board, 1, 5, 'red')
    const newScore = makeScore(
      [1, 2, 3, 4, 5].map(col => ({ row: 1, col })),
      'red',
      'horizontal'
    )
    expect(validateCappedChipsInScore(newScore, board, [cappedScore])).toBe(false)
  })

  it('rejects a capped chip that does not belong to any capped score', () => {
    const board = makeBoard()
    // Capped chip on the board but no matching entry in cappedScores
    placeChip(board, 1, 2, 'red', true)
    for (let row = 2; row <= 5; row++) placeChip(board, row, 2, 'red')
    const newScore = makeScore(
      [1, 2, 3, 4, 5].map(row => ({ row, col: 2 })),
      'red',
      'vertical'
    )
    expect(validateCappedChipsInScore(newScore, board, [])).toBe(false)
  })
})

describe('checkWinCondition', () => {
  const dummyCells = [0, 1, 2, 3, 4].map(col => ({ row: 0, col }))

  it('returns null with fewer than 4 capped scores', () => {
    const scores = [0, 1, 2].map(i =>
      makeScore(dummyCells, 'red', 'horizontal', true)
    )
    expect(checkWinCondition(scores)).toBeNull()
  })

  it('returns the color with 4 capped scores', () => {
    const scores = [0, 1, 2, 3].map(() =>
      makeScore(dummyCells, 'blue', 'horizontal', true)
    )
    expect(checkWinCondition(scores)).toBe('blue')
  })

  it('ignores uncapped scores', () => {
    const scores = [0, 1, 2, 3].map(() =>
      makeScore(dummyCells, 'red', 'horizontal', false)
    )
    expect(checkWinCondition(scores)).toBeNull()
  })
})
