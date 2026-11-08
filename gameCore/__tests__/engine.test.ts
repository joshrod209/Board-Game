/**
 * Online game engine: seating, turns, wild cards, burning, capping, hidden hands
 */

import { describe, it, expect } from 'vitest'
import type { Card } from '../types'
import {
  type GameState,
  type Seat,
  orderSeats,
  createGame,
  playCard,
  burnCard,
  capCells,
  shuffleAndDeal,
  newGame,
  viewFor,
  currentSeat,
  checkCapCell,
  isPlayableFor,
  passTurn,
  turnOptions,
} from '../engine'

/** Deterministic RNG so deals are repeatable */
function seededRng(seed = 1) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

const RED1: Seat = { id: 'r1', name: 'Ana', team: 'red' }
const BLUE1: Seat = { id: 'b1', name: 'Ben', team: 'blue' }
const RED2: Seat = { id: 'r2', name: 'Cat', team: 'red' }
const BLUE2: Seat = { id: 'b2', name: 'Dan', team: 'blue' }

function twoPlayer(): GameState {
  return createGame([RED1, BLUE1], seededRng())
}

function fourPlayer(): GameState {
  const ordered = orderSeats([RED1, RED2, BLUE1, BLUE2])
  if (!ordered.ok) throw new Error(ordered.error)
  return createGame(ordered.seats, seededRng())
}

/** Give a player a specific hand */
function withHand(state: GameState, playerId: string, cards: Card[]): GameState {
  return { ...state, hands: { ...state.hands, [playerId]: cards } }
}

function expectOk(result: ReturnType<typeof playCard>): GameState {
  if (!result.ok) throw new Error(`Expected ok, got: ${result.error}`)
  return result.state
}

// board[0][1] is the 9 of clubs
const NINE_CLUBS: Card = { suit: 'clubs', rank: '9', id: 'test-9c' }
const TWO_EYED: Card = { suit: 'diamonds', rank: 'J', id: 'test-jd', wildCardType: 'twoEyedJack' }
const ONE_EYED: Card = { suit: 'spades', rank: 'J', id: 'test-js', wildCardType: 'oneEyedJack' }
const JOKER: Card = { suit: 'joker', rank: 'Joker', id: 'test-joker', wildCardType: 'joker' }

describe('orderSeats', () => {
  it('alternates teams in a 4-player game', () => {
    const result = orderSeats([RED1, RED2, BLUE1, BLUE2])
    expect(result.ok && result.seats.map(s => s.id)).toEqual(['r1', 'b1', 'r2', 'b2'])
  })

  it('rejects 3 players and uneven teams', () => {
    expect(orderSeats([RED1, BLUE1, RED2]).ok).toBe(false)
    expect(orderSeats([RED1, RED2]).ok).toBe(false)
    expect(orderSeats([RED1, RED2, BLUE1, { ...BLUE2, team: 'red' }]).ok).toBe(false)
  })
})

describe('createGame', () => {
  it('deals 5 unique cards to each of 4 players', () => {
    const state = fourPlayer()
    const all = Object.values(state.hands).flat()
    expect(Object.keys(state.hands)).toHaveLength(4)
    Object.values(state.hands).forEach(hand => expect(hand).toHaveLength(5))
    expect(new Set(all.map(c => c.id)).size).toBe(20)
    expect(state.deck).toHaveLength(108 - 20)
    expect(currentSeat(state).id).toBe('r1')
  })
})

describe('playCard', () => {
  it('places a chip, draws a replacement and passes the turn', () => {
    const state = withHand(twoPlayer(), 'r1', [NINE_CLUBS])
    const next = expectOk(playCard(state, 'r1', NINE_CLUBS.id, 0, 1))
    expect(next.board[0][1].chip).toBe('red')
    expect(next.hands.r1).toHaveLength(1)
    expect(next.hands.r1[0].id).not.toBe(NINE_CLUBS.id)
    expect(next.discardPile[0]).toMatchObject({ id: NINE_CLUBS.id, playedBy: 'r1' })
    expect(next.deck).toHaveLength(state.deck.length - 1)
    expect(currentSeat(next).id).toBe('b1')
    expect(next.lastMove).toMatchObject({ row: 0, col: 1, kind: 'add', by: 'r1' })
  })

  it("rejects moves when it isn't your turn", () => {
    const state = withHand(twoPlayer(), 'b1', [NINE_CLUBS])
    const result = playCard(state, 'b1', NINE_CLUBS.id, 0, 1)
    expect(result.ok).toBe(false)
  })

  it("rejects cards that aren't in your hand or don't match the square", () => {
    const state = withHand(twoPlayer(), 'r1', [NINE_CLUBS])
    expect(playCard(state, 'r1', 'not-mine', 0, 1).ok).toBe(false)
    expect(playCard(state, 'r1', NINE_CLUBS.id, 0, 2).ok).toBe(false)
  })

  it('turns go red, blue, red, blue around a 4-player table', () => {
    let state = fourPlayer()
    const order: string[] = []
    for (let i = 0; i < 5; i++) {
      const seat = currentSeat(state)
      order.push(seat.id)
      state = withHand(state, seat.id, [JOKER])
      state = expectOk(playCard(state, seat.id, JOKER.id, 5, 1 + i, 'add'))
      expect(state.board[5][1 + i].chip).toBe(seat.team)
    }
    expect(order).toEqual(['r1', 'b1', 'r2', 'b2', 'r1'])
  })

  it('two-eyed jack places on any open square, then ends the turn', () => {
    let state = withHand(twoPlayer(), 'r1', [TWO_EYED])
    state = { ...state, board: state.board.map(r => r.map(c => ({ ...c }))) }
    state.board[4][4].chip = 'blue'
    expect(playCard(state, 'r1', TWO_EYED.id, 0, 0).ok).toBe(false) // corner joker
    expect(playCard(state, 'r1', TWO_EYED.id, 4, 4).ok).toBe(false) // taken
    const next = expectOk(playCard(state, 'r1', TWO_EYED.id, 5, 5))
    expect(next.board[5][5].chip).toBe('red')
    expect(currentSeat(next).id).toBe('b1')
  })

  it("one-eyed jack can't remove a capped chip", () => {
    let state = withHand(twoPlayer(), 'r1', [ONE_EYED])
    state = { ...state, board: state.board.map(r => r.map(c => ({ ...c }))) }
    state.board[3][3].chip = 'blue'
    state.board[3][3].isCapped = true
    expect(playCard(state, 'r1', ONE_EYED.id, 3, 3).ok).toBe(false)
  })

  it('joker can remove an opponent chip and ends the turn', () => {
    let state = withHand(twoPlayer(), 'r1', [JOKER])
    state = { ...state, board: state.board.map(r => r.map(c => ({ ...c }))) }
    state.board[3][3].chip = 'blue'
    const next = expectOk(playCard(state, 'r1', JOKER.id, 3, 3, 'remove'))
    expect(next.board[3][3].chip).toBeNull()
    expect(currentSeat(next).id).toBe('b1')
  })

  it('one-eyed jack removes an opponent chip but not your own', () => {
    let state = withHand(twoPlayer(), 'r1', [ONE_EYED])
    state = { ...state, board: state.board.map(r => r.map(c => ({ ...c }))) }
    state.board[3][3].chip = 'blue'
    state.board[4][4].chip = 'red'
    expect(playCard(state, 'r1', ONE_EYED.id, 4, 4).ok).toBe(false)
    const next = expectOk(playCard(state, 'r1', ONE_EYED.id, 3, 3))
    expect(next.board[3][3].chip).toBeNull()
    expect(currentSeat(next).id).toBe('b1')
  })

  it('in 4 players, teammates share a chip color and opponents are the other team', () => {
    let state = fourPlayer()
    state = { ...state, turnIndex: 2 } // r2
    state = withHand(state, 'r2', [ONE_EYED])
    state = { ...state, board: state.board.map(r => r.map(c => ({ ...c }))) }
    state.board[3][3].chip = 'red' // placed by teammate r1
    state.board[4][4].chip = 'blue'
    expect(playCard(state, 'r2', ONE_EYED.id, 3, 3).ok).toBe(false)
    expect(playCard(state, 'r2', ONE_EYED.id, 4, 4).ok).toBe(true)
  })

  it('joker needs an add/remove choice', () => {
    const state = withHand(twoPlayer(), 'r1', [JOKER])
    expect(playCard(state, 'r1', JOKER.id, 5, 5).ok).toBe(false)
    const next = expectOk(playCard(state, 'r1', JOKER.id, 5, 5, 'add'))
    expect(next.board[5][5].chip).toBe('red')
    expect(currentSeat(next).id).toBe('b1')
  })
})

describe('burnCard', () => {
  it('refuses to burn a playable card', () => {
    const state = withHand(twoPlayer(), 'r1', [NINE_CLUBS])
    expect(burnCard(state, 'r1', NINE_CLUBS.id).ok).toBe(false)
  })

  it('burns an unplayable card once per turn', () => {
    let state = withHand(twoPlayer(), 'r1', [NINE_CLUBS, { ...NINE_CLUBS, id: 'test-9c-2' }])
    state = { ...state, board: state.board.map(r => r.map(c => ({ ...c }))) }
    // Fill every 9 of clubs square so the card has nowhere to go
    state.board.flat().filter(c => c.rank === '9' && c.suit === 'clubs').forEach(c => (c.chip = 'blue'))
    const next = expectOk(burnCard(state, 'r1', NINE_CLUBS.id))
    expect(next.hasBurnedThisTurn).toBe(true)
    expect(next.hands.r1).toHaveLength(2)
    expect(currentSeat(next).id).toBe('r1')
    expect(burnCard(next, 'r1', 'test-9c-2').ok).toBe(false)
  })
})

describe('burning and passing', () => {
  /** Board where every square is taken, so no regular card can be played */
  function fullBoard(state: GameState, color: 'red' | 'blue' = 'red'): GameState {
    return {
      ...state,
      board: state.board.map(r => r.map(c => ({ ...c, chip: c.isCorner ? null : color }))),
    }
  }
  const DEAD_A: Card = { ...NINE_CLUBS, id: 'dead-a' }
  const DEAD_B: Card = { ...NINE_CLUBS, id: 'dead-b' }

  it('lets you burn a one-eyed jack when only your own chips are on the board', () => {
    let state = withHand(twoPlayer(), 'r1', [ONE_EYED])
    state = { ...state, board: state.board.map(r => r.map(c => ({ ...c }))) }
    state.board[3][3].chip = 'red'
    expect(isPlayableFor(ONE_EYED, state.board, 'red')).toBe(false)
    expect(burnCard(state, 'r1', ONE_EYED.id).ok).toBe(true)
  })

  it("won't let you pass while a regular card can be played", () => {
    const state = withHand(twoPlayer(), 'r1', [NINE_CLUBS, TWO_EYED])
    expect(turnOptions(state, 'r1').canPass).toBe(false)
    expect(viewFor(state, 'r1').canPass).toBe(false)
    expect(passTurn(state, 'r1').ok).toBe(false)
  })

  it('burn keeps your turn, then you can pass', () => {
    let state = withHand(fullBoard(fourPlayer()), 'r1', [DEAD_A, DEAD_B])
    expect(turnOptions(state, 'r1')).toMatchObject({ canPlay: false, canBurn: true, canPass: true })
    state = expectOk(burnCard(state, 'r1', DEAD_A.id))
    expect(currentSeat(state).id).toBe('r1') // turn continues after a burn
    expect(burnCard(state, 'r1', DEAD_B.id).ok).toBe(false) // once per turn
    state = withHand(state, 'r1', [DEAD_B]) // keep the hand dead whatever was drawn
    const next = expectOk(passTurn(state, 'r1'))
    expect(currentSeat(next).id).toBe('b1')
    expect(next.hasBurnedThisTurn).toBe(false)
  })

  it('burning first is optional: a dead hand can pass straight away', () => {
    const state = withHand(fullBoard(twoPlayer()), 'r1', [DEAD_A])
    expect(passTurn(state, 'r1').ok).toBe(true)
  })

  it("wild cards never force a move: you can pass holding playable jacks and jokers", () => {
    // Opponent chips everywhere: one-eyed jack and joker could both be played
    const state = withHand(fullBoard(twoPlayer(), 'blue'), 'r1', [ONE_EYED, JOKER, DEAD_A])
    expect(turnOptions(state, 'r1')).toMatchObject({ canPlay: true, canPass: true })
    expect(viewFor(state, 'r1').canPass).toBe(true)
    expect(viewFor(state, 'b1').canPass).toBe(false) // only on your turn
    expect(passTurn(state, 'b1').ok).toBe(false)
    expect(currentSeat(expectOk(passTurn(state, 'r1'))).id).toBe('b1')
  })

  it('a playable wild card cannot be burned', () => {
    const state = withHand(twoPlayer(), 'r1', [TWO_EYED])
    expect(burnCard(state, 'r1', TWO_EYED.id).ok).toBe(false)
  })

  it('you can pass with an empty hand or an empty deck', () => {
    expect(passTurn(withHand(twoPlayer(), 'r1', []), 'r1').ok).toBe(true)
    const noDeck = { ...withHand(fullBoard(twoPlayer()), 'r1', [DEAD_A]), deck: [] }
    expect(turnOptions(noDeck, 'r1').canBurn).toBe(false)
    expect(passTurn(noDeck, 'r1').ok).toBe(true)
  })
})

describe('capCells', () => {
  function withRedLine(state: GameState): GameState {
    const board = state.board.map(r => r.map(c => ({ ...c })))
    for (let col = 2; col <= 6; col++) board[2][col].chip = 'red'
    return { ...state, board }
  }
  const LINE = [2, 3, 4, 5, 6].map(col => ({ row: 2, col }))

  it('caps a red line for a red player, even off-turn', () => {
    let state = withRedLine(fourPlayer())
    state = { ...state, turnIndex: 1 } // blue's turn
    const next = expectOk(capCells(state, 'r2', LINE))
    expect(next.cappedScores).toHaveLength(1)
    expect(next.cappedScores[0].color).toBe('red')
    LINE.forEach(({ row, col }) => expect(next.board[row][col].isCapped).toBe(true))
    expect(next.winner).toBeNull()
  })

  it("won't let blue cap red's line or cap the same line twice", () => {
    const state = withRedLine(twoPlayer())
    expect(capCells(state, 'b1', LINE).ok).toBe(false)
    const next = expectOk(capCells(state, 'r1', LINE))
    expect(capCells(next, 'r1', LINE).ok).toBe(false)
  })

  it('rejects 5 squares that are not in a line', () => {
    const state = withRedLine(twoPlayer())
    state.board[3][2].chip = 'red'
    const bad = [...LINE.slice(0, 4), { row: 3, col: 2 }]
    expect(capCells(state, 'r1', bad).ok).toBe(false)
  })

  it('checkCapCell blocks squares without your chip', () => {
    const state = withRedLine(twoPlayer())
    expect(checkCapCell(state.board, [], 'red', [], 2, 2)).toBeNull()
    expect(checkCapCell(state.board, [], 'red', [], 7, 7)).not.toBeNull()
    expect(checkCapCell(state.board, [], 'blue', [], 2, 2)).not.toBeNull()
  })

  it('declares the team with 4 capped scores the winner', () => {
    let state = twoPlayer()
    const fake = (i: number) => ({
      id: `fake-${i}`,
      cells: [{ row: 9, col: i }],
      color: 'red' as const,
      direction: 'horizontal' as const,
      isCapped: true,
    })
    state = withRedLine({ ...state, cappedScores: [fake(1), fake(2), fake(3)] })
    const next = expectOk(capCells(state, 'r1', LINE))
    expect(next.winner).toBe('red')
    expect(playCard(next, 'r1', 'anything', 0, 1).ok).toBe(false)

    const again = expectOk(newGame(next, 'b1', seededRng(7)))
    expect(again.winner).toBeNull()
    expect(again.cappedScores).toHaveLength(0)
    expect(currentSeat(again).id).toBe('b1') // starting player rotates
  })
})

describe('shuffleAndDeal', () => {
  it('only works once the deck is empty', () => {
    const state = twoPlayer()
    expect(shuffleAndDeal(state, 'r1').ok).toBe(false)
    const next = expectOk(shuffleAndDeal({ ...state, deck: [] }, 'r1', seededRng(3)))
    expect(next.hands.r1).toHaveLength(5)
    expect(next.deck.length).toBeGreaterThan(0)
  })
})

describe('viewFor', () => {
  it("shows only your own hand and everyone's card counts", () => {
    const state = fourPlayer()
    const view = viewFor(state, 'b1')
    expect(view.hand).toEqual(state.hands.b1)
    expect(JSON.stringify(view)).not.toContain(state.hands.r1[0].id)
    expect(view.seats.map(s => s.cardCount)).toEqual([5, 5, 5, 5])
    expect(view.currentPlayerId).toBe('r1')
    expect('deck' in view).toBe(false)
  })
})
