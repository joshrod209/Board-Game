/**
 * Pure game engine for online play.
 *
 * The server owns one GameState per room and runs every move through these
 * functions. Each one checks the move and returns a new state (or an error),
 * so the rules live in one place and clients can't cheat or see other hands.
 *
 * Teams: chip colors are team colors. 2 players = red vs blue; 4 players =
 * two per team, seated red, blue, red, blue so turns alternate between teams.
 */

import type { Card, Cell, ChipColor, Score } from './types'
import { INITIAL_HAND_SIZE } from './constants'
import { boardLayout } from './boardLayout'
import { createFullDeck } from './deck'
import { playCard as validatePlayCard } from './playCard'
import { isCardPlayable } from './burnRule'
import { wildCardAddChip, wildCardRemoveChip } from './jokerLogic'
import {
  detectScores,
  capScore,
  checkWinCondition,
  validateCappedChipsInScore,
  validateConsecutiveLine,
} from './scoreDetection'

export type Team = 'red' | 'blue'

export type Seat = {
  id: string
  name: string
  team: Team
}

export type CellPos = { row: number; col: number }

export type LastMove = {
  row: number
  col: number
  kind: 'add' | 'remove'
  by: string
}

export type GameState = {
  /** Players in turn order */
  seats: Seat[]
  board: Cell[][]
  deck: Card[]
  hands: Record<string, Card[]>
  /** Most recent first */
  discardPile: Card[]
  cappedScores: Score[]
  turnIndex: number
  startingIndex: number
  hasBurnedThisTurn: boolean
  winner: Team | null
  lastMove: LastMove | null
  /** Short description of the latest action, shown to everyone */
  lastEvent: string | null
}

export type EngineResult = { ok: true; state: GameState } | { ok: false; error: string }

export type Rng = () => number

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

export function createBoard(): Cell[][] {
  return boardLayout.map(row =>
    row.map(cell => ({
      id: cell.id,
      row: cell.row,
      col: cell.col,
      rank: cell.rank,
      suit: cell.suit,
      isCorner: cell.isCorner,
      isRoyalBelt: cell.isRoyalBelt,
      chip: null,
      isCapped: false,
      scoreIds: [],
    }))
  )
}

export function shuffled<T>(items: T[], rng: Rng = Math.random): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Check team sizes and return players in turn order (red, blue, red, blue).
 */
export function orderSeats(players: Seat[]): { ok: true; seats: Seat[] } | { ok: false; error: string } {
  const red = players.filter(p => p.team === 'red')
  const blue = players.filter(p => p.team === 'blue')
  if (players.length !== 2 && players.length !== 4) {
    return { ok: false, error: 'Games need exactly 2 or 4 players' }
  }
  if (red.length !== blue.length) {
    return { ok: false, error: 'Teams must be even: one each for 2 players, two each for 4' }
  }
  const seats: Seat[] = []
  for (let i = 0; i < red.length; i++) seats.push(red[i], blue[i])
  return { ok: true, seats }
}

function deal(seats: Seat[], rng: Rng) {
  const deck = shuffled(createFullDeck(), rng)
  const hands: Record<string, Card[]> = {}
  for (const seat of seats) hands[seat.id] = []
  for (let i = 0; i < INITIAL_HAND_SIZE; i++) {
    for (const seat of seats) {
      const card = deck.pop()
      if (card) hands[seat.id].push(card)
    }
  }
  return { deck, hands }
}

export function createGame(seats: Seat[], rng: Rng = Math.random, startingIndex = 0): GameState {
  const { deck, hands } = deal(seats, rng)
  return {
    seats,
    board: createBoard(),
    deck,
    hands,
    discardPile: [],
    cappedScores: [],
    turnIndex: startingIndex % seats.length,
    startingIndex: startingIndex % seats.length,
    hasBurnedThisTurn: false,
    winner: null,
    lastMove: null,
    lastEvent: null,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function currentSeat(state: GameState): Seat {
  return state.seats[state.turnIndex]
}

export function seatOf(state: GameState, playerId: string): Seat | undefined {
  return state.seats.find(s => s.id === playerId)
}

export function otherTeam(team: Team): Team {
  return team === 'red' ? 'blue' : 'red'
}

export function cardLabel(card: Card): string {
  if (card.suit === 'joker') return 'a Joker'
  const suit = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' }[card.suit]
  return `${card.rank}${suit}`
}

/** Cells holding permanent cappers, keyed "row,col" (corner jokers excluded) */
export function permanentCapperMap(board: Cell[][], cappedScores: Score[]): Map<string, ChipColor> {
  const map = new Map<string, ChipColor>()
  for (const score of cappedScores) {
    if (!score.isCapped) continue
    for (const { row, col } of score.cells) {
      const cell = board[row]?.[col]
      if (cell && !cell.isCorner) map.set(`${row},${col}`, score.color)
    }
  }
  return map
}

function setCell(board: Cell[][], row: number, col: number, patch: Partial<Cell>): Cell[][] {
  return board.map((r, ri) => (ri === row ? r.map((c, ci) => (ci === col ? { ...c, ...patch } : c)) : r))
}

function sameScore(a: Score, b: Score): boolean {
  if (a.id === b.id) return true
  if (a.color !== b.color || a.direction !== b.direction) return false
  if (a.cells.length !== b.cells.length) return false
  const ids = (s: Score) => s.cells.map(c => `${c.row},${c.col}`).sort()
  const ai = ids(a)
  const bi = ids(b)
  return ai.every((id, i) => id === bi[i])
}

function endTurn(state: GameState): GameState {
  return {
    ...state,
    turnIndex: (state.turnIndex + 1) % state.seats.length,
    hasBurnedThisTurn: false,
  }
}

/** Remove a card from the player's hand, discard it, and draw a replacement */
function spendCard(state: GameState, playerId: string, card: Card): GameState {
  const deck = [...state.deck]
  const hand = state.hands[playerId].filter(c => c.id !== card.id)
  const drawn = deck.pop()
  if (drawn) hand.push(drawn)
  return {
    ...state,
    deck,
    hands: { ...state.hands, [playerId]: hand },
    discardPile: [card, ...state.discardPile],
  }
}

// ---------------------------------------------------------------------------
// Turn actions
// ---------------------------------------------------------------------------

function checkTurn(state: GameState, playerId: string): string | null {
  if (state.winner) return 'The game is over'
  if (!seatOf(state, playerId)) return 'You are not in this game'
  if (currentSeat(state).id !== playerId) return "It's not your turn"
  return null
}

export function playCard(
  state: GameState,
  playerId: string,
  cardId: string,
  row: number,
  col: number,
  jokerAction?: 'add' | 'remove'
): EngineResult {
  const turnError = checkTurn(state, playerId)
  if (turnError) return { ok: false, error: turnError }

  const seat = seatOf(state, playerId)!
  const card = state.hands[playerId]?.find(c => c.id === cardId)
  if (!card) return { ok: false, error: 'That card is not in your hand' }

  const team = seat.team
  const opponent = otherTeam(team)

  // Every card play ends the turn:
  // - two-eyed jack: add a chip on any empty, non-corner square
  // - one-eyed jack: remove any uncapped opponent chip
  // - joker: either of the above
  let action: 'add' | 'remove'

  if (card.wildCardType === 'twoEyedJack') {
    const check = wildCardAddChip(row, col, team, state.board)
    if (!check.success) return { ok: false, error: check.error ?? 'Cannot place a chip there' }
    action = 'add'
  } else if (card.wildCardType === 'oneEyedJack') {
    const check = wildCardRemoveChip(row, col, opponent, state.board)
    if (!check.success) return { ok: false, error: check.error ?? 'Cannot remove that chip' }
    action = 'remove'
  } else if (card.wildCardType === 'joker') {
    if (jokerAction !== 'add' && jokerAction !== 'remove') {
      return { ok: false, error: 'Choose Add or Remove for the Joker first' }
    }
    const check =
      jokerAction === 'add'
        ? wildCardAddChip(row, col, team, state.board)
        : wildCardRemoveChip(row, col, opponent, state.board)
    if (!check.success) return { ok: false, error: check.error ?? 'Cannot play the Joker there' }
    action = jokerAction
  } else {
    const check = validatePlayCard(card, row, col, state.board)
    if (!check.success) return { ok: false, error: check.error ?? 'Cannot play that card there' }
    action = 'add'
  }

  const board =
    action === 'add'
      ? setCell(state.board, row, col, { chip: team })
      : setCell(state.board, row, col, { chip: null, scoreIds: [] })

  let next = spendCard({ ...state, board }, playerId, card)
  next = {
    ...next,
    lastMove: { row, col, kind: action, by: playerId },
    lastEvent:
      action === 'add'
        ? `${seat.name} played ${cardLabel(card)}`
        : `${seat.name} removed a ${opponent} chip with ${cardLabel(card)}`,
  }
  return { ok: true, state: endTurn(next) }
}

export function burnCard(state: GameState, playerId: string, cardId: string): EngineResult {
  const turnError = checkTurn(state, playerId)
  if (turnError) return { ok: false, error: turnError }
  if (state.hasBurnedThisTurn) return { ok: false, error: 'You can only burn one card per turn' }

  const card = state.hands[playerId]?.find(c => c.id === cardId)
  if (!card) return { ok: false, error: 'That card is not in your hand' }
  if (isCardPlayable(card, state.board)) {
    return { ok: false, error: 'That card is playable, so it cannot be burned' }
  }
  if (state.deck.length === 0) return { ok: false, error: 'The deck is empty' }

  const seat = seatOf(state, playerId)!
  const next = spendCard(state, playerId, card)
  return {
    ok: true,
    state: { ...next, hasBurnedThisTurn: true, lastEvent: `${seat.name} burned ${cardLabel(card)}` },
  }
}

/** Fresh deck and hands once the deck or every hand runs out */
export function shuffleAndDeal(state: GameState, playerId: string, rng: Rng = Math.random): EngineResult {
  if (state.winner) return { ok: false, error: 'The game is over' }
  const seat = seatOf(state, playerId)
  if (!seat) return { ok: false, error: 'You are not in this game' }
  const allEmpty = state.seats.every(s => (state.hands[s.id]?.length ?? 0) === 0)
  if (state.deck.length > 0 && !allEmpty) {
    return { ok: false, error: 'You can reshuffle only when the deck or every hand is empty' }
  }
  const { deck, hands } = deal(state.seats, rng)
  return {
    ok: true,
    state: { ...state, deck, hands, discardPile: [], lastEvent: `${seat.name} shuffled and dealt new hands` },
  }
}

/** Start the next game, rotating who goes first (which alternates teams) */
export function newGame(state: GameState, playerId: string, rng: Rng = Math.random): EngineResult {
  if (!state.winner) return { ok: false, error: 'The current game is still going' }
  if (!seatOf(state, playerId)) return { ok: false, error: 'You are not in this game' }
  const startingIndex = (state.startingIndex + 1) % state.seats.length
  const game = createGame(state.seats, rng, startingIndex)
  return { ok: true, state: { ...game, lastEvent: `New game: ${state.seats[startingIndex].name} goes first` } }
}

// ---------------------------------------------------------------------------
// Capping
// ---------------------------------------------------------------------------

/**
 * Can this cell be added to a cap selection? Returns an error message or null.
 * Clients call it on every click for instant feedback; the server re-checks
 * the whole selection before capping.
 */
export function checkCapCell(
  board: Cell[][],
  cappedScores: Score[],
  color: ChipColor,
  selection: CellPos[],
  row: number,
  col: number
): string | null {
  const cell = board[row]?.[col]
  if (!cell) return 'That square is off the board'
  if (selection.some(c => c.row === row && c.col === col)) return 'That square is already selected'

  if (!cell.isCorner) {
    const capper = permanentCapperMap(board, cappedScores).get(`${row},${col}`)
    if (capper && capper !== color) return "You can't use the other team's capped chips"
    if (cell.chip !== color) return 'Pick squares with your own chips'
  }

  if (cell.isCapped && cell.chip === color) {
    const selectedCapped = selection.filter(({ row: r, col: c }) => {
      const sc = board[r][c]
      return sc?.isCapped && sc?.chip === color
    })
    if (selectedCapped.length >= 2) return 'A score can reuse at most 2 capped chips'
    if (selectedCapped.length === 1) {
      const first = selectedCapped[0]
      const scoresWith = (r: number, c: number) =>
        new Set(
          cappedScores
            .filter(s => s.color === color && s.isCapped && s.cells.some(p => p.row === r && p.col === c))
            .map(s => s.id)
        )
      const a = scoresWith(first.row, first.col)
      const b = scoresWith(row, col)
      if (Array.from(a).some(id => b.has(id))) return 'The 2 capped chips must come from different scores'
    }
  }
  return null
}

/**
 * Given 5 selected cells, return the new scores they cap (a double, triple or
 * quad caps several lines at once), or an empty list if they aren't a valid score.
 */
export function findScoresToCap(
  board: Cell[][],
  cappedScores: Score[],
  color: ChipColor,
  selection: CellPos[]
): Score[] {
  const validated = validateConsecutiveLine(selection, board, color)
  if (!validated) return []

  const selectedIds = selection.map(c => `${c.row},${c.col}`).sort()
  const matching = detectScores(board, color, cappedScores).filter(score => {
    const ids = score.cells.map(c => `${c.row},${c.col}`).sort()
    if (ids.length !== selectedIds.length || ids.some((id, i) => id !== selectedIds[i])) return false
    if (cappedScores.some(capped => capped.isCapped && sameScore(capped, score))) return false

    const allCellsCapped = score.cells.every(({ row, col }) => board[row][col]?.isCapped === true)
    if (allCellsCapped) {
      const cellScoreIds = new Set<string>()
      score.cells.forEach(({ row, col }) => board[row][col]?.scoreIds.forEach(id => cellScoreIds.add(id)))
      return cappedScores.some(s => cellScoreIds.has(s.id) && s.color === color)
    }
    return validateCappedChipsInScore(score, board, cappedScores)
  })

  if (!matching.some(s => sameScore(s, validated))) matching.push(validated)

  const unique: Score[] = []
  for (const score of matching) {
    if (cappedScores.some(c => sameScore(c, score))) continue
    if (unique.some(u => sameScore(u, score))) continue
    unique.push(score)
  }
  return unique
}

/** Are there still uncapped, valid scores for this color? */
export function hasScoresToCap(board: Cell[][], cappedScores: Score[], color: ChipColor): boolean {
  return detectScores(board, color, cappedScores).some(
    score =>
      !cappedScores.some(c => sameScore(c, score)) && validateCappedChipsInScore(score, board, cappedScores)
  )
}

/** Cap a score for the player's own team. Allowed on anyone's turn. */
export function capCells(state: GameState, playerId: string, cells: CellPos[]): EngineResult {
  if (state.winner) return { ok: false, error: 'The game is over' }
  const seat = seatOf(state, playerId)
  if (!seat) return { ok: false, error: 'You are not in this game' }
  if (cells.length !== 5) return { ok: false, error: 'Select exactly 5 squares to cap' }

  const color = seat.team
  const selection: CellPos[] = []
  for (const { row, col } of cells) {
    const error = checkCapCell(state.board, state.cappedScores, color, selection, row, col)
    if (error) return { ok: false, error }
    selection.push({ row, col })
  }

  const toCap = findScoresToCap(state.board, state.cappedScores, color, selection)
  if (toCap.length === 0) return { ok: false, error: "Those 5 squares aren't a score you can cap" }

  const board = state.board.map(r => r.map(c => ({ ...c, scoreIds: [...c.scoreIds] })))
  const newScores = toCap.map(s => ({ ...s, cells: s.cells.map(c => ({ ...c })), isCapped: true }))
  newScores.forEach(score => capScore(board, score))
  const cappedScores = [...state.cappedScores, ...newScores]
  const winner = checkWinCondition(cappedScores) as Team | null

  const label = newScores.length === 1 ? 'a score' : ['', '', 'a double', 'a triple', 'a quad'][newScores.length] ?? `${newScores.length} scores`
  return {
    ok: true,
    state: {
      ...state,
      board,
      cappedScores,
      winner: winner ?? state.winner,
      lastEvent: winner
        ? `${seat.name} capped ${label}. ${winner.toUpperCase()} team wins!`
        : `${seat.name} capped ${label} for ${color}`,
    },
  }
}

// ---------------------------------------------------------------------------
// What each player is allowed to see
// ---------------------------------------------------------------------------

export type PlayerView = {
  you: string
  seats: Array<Seat & { cardCount: number }>
  board: Cell[][]
  hand: Card[]
  discardPile: Card[]
  deckCount: number
  cappedScores: Score[]
  currentPlayerId: string
  hasBurnedThisTurn: boolean
  winner: Team | null
  lastMove: LastMove | null
  lastEvent: string | null
}

export function viewFor(state: GameState, playerId: string): PlayerView {
  return {
    you: playerId,
    seats: state.seats.map(s => ({ ...s, cardCount: state.hands[s.id]?.length ?? 0 })),
    board: state.board,
    hand: state.hands[playerId] ?? [],
    discardPile: state.discardPile,
    deckCount: state.deck.length,
    cappedScores: state.cappedScores,
    currentPlayerId: currentSeat(state).id,
    hasBurnedThisTurn: state.hasBurnedThisTurn,
    winner: state.winner,
    lastMove: state.lastMove,
    lastEvent: state.lastEvent,
  }
}
