/**
 * Lines longer than 5 chips: the player chooses which 5 to cap, and a second
 * score from the same line is only allowed if it shares at most one chip with
 * each capped score (so 6, 7 and 8 count once; 9 and 10 can count twice).
 */

import { describe, it, expect } from 'vitest'
import { type GameState, type Seat, createGame, capCells, hasScoresToCap, CAP_MESSAGES } from '../engine'

const SEATS: Seat[] = [
  { id: 'r1', name: 'Ana', team: 'red' },
  { id: 'b1', name: 'Ben', team: 'blue' },
]
const ROW = 2 // a row with no corner squares

function clone(state: GameState): GameState {
  return { ...state, board: state.board.map(r => r.map(c => ({ ...c, scoreIds: [...c.scoreIds] }))) }
}

/** A game with `length` red chips in a row, starting at column 0 */
function withRun(length: number): GameState {
  const state = clone(createGame(SEATS))
  for (let c = 0; c < length; c++) state.board[ROW][c].chip = 'red'
  return state
}

/** The 5 squares from column `from` */
const five = (from: number) => Array.from({ length: 5 }, (_, i) => ({ row: ROW, col: from + i }))

function cap(state: GameState, from: number) {
  return capCells(state, 'r1', five(from))
}

function capOk(state: GameState, from: number): GameState {
  const result = cap(state, from)
  if (!result.ok) throw new Error(`Expected cap from col ${from} to succeed: ${result.error}`)
  return clone(result.state)
}

const redScores = (state: GameState) => state.cappedScores.filter(s => s.color === 'red').length

describe('capping lines longer than 5', () => {
  it('a line of 6: the player picks either end, and it counts once', () => {
    for (const [first, second] of [
      [0, 1],
      [1, 0],
    ]) {
      const state = capOk(withRun(6), first)
      const again = cap(state, second)
      expect(again.ok).toBe(false)
      if (!again.ok) expect(again.error).toBe(CAP_MESSAGES.overlap)
      expect(redScores(state)).toBe(1)
      expect(hasScoresToCap(state.board, state.cappedScores, 'red')).toBe(false)
    }
  })

  it('all 6 squares of a 6-chip line cannot be capped as one score', () => {
    const result = capCells(withRun(6), 'r1', Array.from({ length: 6 }, (_, c) => ({ row: ROW, col: c })))
    expect(result.ok).toBe(false)
  })

  it('a line of 7 counts once', () => {
    const state = capOk(withRun(7), 0)
    expect(cap(state, 2).ok).toBe(false)
    expect(redScores(state)).toBe(1)
    expect(hasScoresToCap(state.board, state.cappedScores, 'red')).toBe(false)
  })

  it('a line of 8 counts once: the far end would reuse 2 chips from the same score', () => {
    const state = capOk(withRun(8), 0)
    const result = cap(state, 3)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe(CAP_MESSAGES.overlap)
    expect(hasScoresToCap(state.board, state.cappedScores, 'red')).toBe(false)
  })

  it('a line of 9 counts twice when the two scores share just the middle chip', () => {
    let state = capOk(withRun(9), 0)
    expect(hasScoresToCap(state.board, state.cappedScores, 'red')).toBe(true)
    state = capOk(state, 4)
    expect(redScores(state)).toBe(2)
    expect(hasScoresToCap(state.board, state.cappedScores, 'red')).toBe(false)
  })

  it('a line of 10 counts twice with no shared chip', () => {
    let state = capOk(withRun(10), 0)
    state = capOk(state, 5)
    expect(redScores(state)).toBe(2)
  })

  it('on a line of 9, capping the middle five first leaves only one score', () => {
    const state = capOk(withRun(9), 2)
    expect(cap(state, 0).ok).toBe(false)
    expect(cap(state, 4).ok).toBe(false)
    expect(redScores(state)).toBe(1)
    expect(hasScoresToCap(state.board, state.cappedScores, 'red')).toBe(false)
  })
})
