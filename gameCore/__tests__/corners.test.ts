/**
 * Corner Joker squares are free spaces: they count for every team, can be
 * part of any line, and never hold a chip or a capper.
 */

import { describe, it, expect } from 'vitest'
import type { Card } from '../types'
import {
  type GameState,
  type Seat,
  createGame,
  capCells,
  playCard,
  permanentCapperMap,
} from '../engine'

const SEATS: Seat[] = [
  { id: 'r1', name: 'Ana', team: 'red' },
  { id: 'b1', name: 'Ben', team: 'blue' },
]

/** Fresh 2-player game with a board we can freely mutate */
function game(): GameState {
  return clone(createGame(SEATS))
}

function clone(state: GameState): GameState {
  return { ...state, board: state.board.map(r => r.map(c => ({ ...c, scoreIds: [...c.scoreIds] }))) }
}

type Pos = [number, number]
const cells = (line: Pos[]) => line.map(([row, col]) => ({ row, col }))

/** Put a team's chips on every non-corner square of the line */
function fill(state: GameState, line: Pos[], color: 'red' | 'blue') {
  for (const [r, c] of line) if (!state.board[r][c].isCorner) state.board[r][c].chip = color
}

/** Cap and return the new state, failing the test if the cap is refused */
function capOk(state: GameState, playerId: string, line: Pos[]): GameState {
  const result = capCells(state, playerId, cells(line))
  if (!result.ok) throw new Error(`Expected cap to succeed: ${result.error}`)
  return clone(result.state)
}

describe('corner free spaces', () => {
  it('the four corners are the free squares', () => {
    const corners = game()
      .board.flat()
      .filter(c => c.isCorner)
      .map(c => `${c.row},${c.col}`)
    expect(corners).toEqual(['0,0', '0,9', '9,0', '9,9'])
  })

  const LINES: Array<[string, Pos[]]> = [
    ['top-left, across', [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]]],
    ['top-left, down', [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]],
    ['top-left, diagonal', [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]]],
    ['top-right, diagonal', [[0, 9], [1, 8], [2, 7], [3, 6], [4, 5]]],
    ['bottom-left, across', [[9, 0], [9, 1], [9, 2], [9, 3], [9, 4]]],
    ['bottom-right, up', [[9, 9], [8, 9], [7, 9], [6, 9], [5, 9]]],
    ['corner at the end of the line', [[0, 5], [0, 6], [0, 7], [0, 8], [0, 9]]],
  ]

  it.each(LINES)('4 chips + a corner is a score (%s)', (_name, line) => {
    const state = game()
    fill(state, line, 'red')
    const result = capCells(state, 'r1', cells(line))
    expect(result.ok).toBe(true)
  })

  it('3 chips + a corner is not a score', () => {
    const state = game()
    fill(state, [[0, 1], [0, 2], [0, 3]], 'red')
    expect(capCells(state, 'r1', cells([[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]])).ok).toBe(false)
  })

  it('both teams can use the same corner, and it never gets a chip or capper', () => {
    let state = game()
    fill(state, [[0, 1], [0, 2], [0, 3], [0, 4]], 'red')
    fill(state, [[1, 0], [2, 0], [3, 0], [4, 0]], 'blue')
    state = capOk(state, 'r1', [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]])
    state = capOk(state, 'b1', [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]])

    expect(state.cappedScores.map(s => s.color)).toEqual(['red', 'blue'])
    expect(state.board[0][0].chip).toBeNull()
    expect(state.board[0][0].isCapped).toBe(false)
    expect(permanentCapperMap(state.board, state.cappedScores).has('0,0')).toBe(false)
  })

  it('one team can use the same corner in two different lines', () => {
    let state = game()
    fill(state, [[0, 1], [0, 2], [0, 3], [0, 4], [1, 1], [2, 2], [3, 3], [4, 4]], 'red')
    state = capOk(state, 'r1', [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]])
    state = capOk(state, 'r1', [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]])
    expect(state.cappedScores.filter(s => s.color === 'red')).toHaveLength(2)
  })

  it('a corner + 1 reused capped chip + 3 new chips is a score', () => {
    let state = game()
    const across: Pos[] = [[2, 0], [2, 1], [2, 2], [2, 3], [2, 4]]
    fill(state, across, 'red')
    state = capOk(state, 'r1', across)
    // Down column 0: corner, new, capped (2,0), new, new
    fill(state, [[1, 0], [3, 0], [4, 0]], 'red')
    state = capOk(state, 'r1', [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]])
    expect(state.cappedScores).toHaveLength(2)
  })

  it("chips can't be placed on or removed from a corner", () => {
    const twoEyed: Card = { suit: 'diamonds', rank: 'J', id: 'tj', wildCardType: 'twoEyedJack' }
    const joker: Card = { suit: 'joker', rank: 'Joker', id: 'jk', wildCardType: 'joker' }
    const oneEyed: Card = { suit: 'spades', rank: 'J', id: 'oj', wildCardType: 'oneEyedJack' }
    const base = game()
    const state = { ...base, hands: { ...base.hands, r1: [twoEyed, joker, oneEyed] } }

    expect(playCard(state, 'r1', 'tj', 0, 0).ok).toBe(false)
    expect(playCard(state, 'r1', 'jk', 9, 9, 'add').ok).toBe(false)
    expect(playCard(state, 'r1', 'jk', 9, 0, 'remove').ok).toBe(false)
    expect(playCard(state, 'r1', 'oj', 0, 9).ok).toBe(false)
    // Corners show a Joker, so no regular card can match them
    expect(state.board[0][0]).toMatchObject({ rank: 'Joker', suit: 'joker' })
  })

  it('4 capped lines that use corners win the game', () => {
    let state = game()
    const lines: Pos[][] = [
      [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
      [[0, 9], [1, 9], [2, 9], [3, 9], [4, 9]],
      [[9, 0], [9, 1], [9, 2], [9, 3], [9, 4]],
      [[9, 9], [8, 8], [7, 7], [6, 6], [5, 5]],
    ]
    lines.forEach(line => fill(state, line, 'red'))
    lines.forEach((line, i) => {
      state = capOk(state, 'r1', line)
      expect(state.winner).toBe(i === 3 ? 'red' : null)
    })
  })
})
