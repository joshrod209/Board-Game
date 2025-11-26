/**
 * Centralized type definitions for Quad Sequence game
 */

// Board Types
export type ChipColor = 'red' | 'blue' | 'green' | 'yellow'

export type BoardCell = {
  row: number
  col: number
  isJoker?: boolean
  chip?: ChipColor | null
  isCapped?: boolean
}

export type Cell = {
  id: string
  row: number
  col: number
  rank: string // "10", "9", ..., "A", "K", "Q", "Joker"
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades' | 'joker'
  isCorner: boolean
  isRoyalBelt: boolean
  chip?: ChipColor | null
  isCapped?: boolean
  scoreIds: string[] // Track which scores this cell belongs to
}

// Card Types
export type Suit = 'spades' | 'hearts' | 'clubs' | 'diamonds'
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'

export type Card = {
  suit: Suit
  rank: Rank
  id: string
}

// Deck Types
export type Deck = {
  cards: Card[]
  shuffle: () => void
  draw: () => Card | null
  reset: () => void
}

// Hand Types
export type Hand = {
  cards: Card[]
  addCard: (card: Card) => void
  removeCard: (cardId: string) => Card | null
  hasCard: (cardId: string) => boolean
}

export type Player = {
  id: string
  name: string
  hand: Hand
  color: ChipColor
}

// Score Types
export type Score = {
  id: string // Unique identifier for this score
  cells: Array<{ row: number; col: number }>
  color: ChipColor
  direction: 'horizontal' | 'vertical' | 'diagonal' | 'anti-diagonal'
  isCapped: boolean // Whether this score has been capped
}

export type ScoreResult = {
  newScores: Score[]
  allScores: Score[]
}

// Game Action Types
export type PlayCardResult = {
  success: boolean
  error?: string
}

export type BurnResult = {
  success: boolean
  error?: string
  newCard?: Card
}

export type JokerAction = 'add' | 'remove'

export type JokerResult = {
  success: boolean
  error?: string
}

