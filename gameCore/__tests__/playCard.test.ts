/**
 * Card placement validation and wild card behavior
 */

import { describe, it, expect } from 'vitest'
import type { Card } from '../types'
import { canPlayCard, playCard } from '../playCard'
import { wildCardAddChip, wildCardRemoveChip } from '../jokerLogic'
import { isCardPlayable, burnCard } from '../burnRule'
import { initializeDeck } from '../deck'
import { makeBoard, placeChip } from './helpers'

function card(rank: Card['rank'], suit: Card['suit'], wildCardType: Card['wildCardType'] = undefined): Card {
  return { rank, suit, id: `test-${rank}-${suit}`, wildCardType }
}

describe('canPlayCard (regular cards)', () => {
  it('allows a card on its matching empty cell', () => {
    const board = makeBoard()
    // (0,1) is 9 of clubs in the layout
    expect(canPlayCard(card('9', 'clubs'), 0, 1, board)).toBe(true)
  })

  it('rejects a card on a non-matching cell', () => {
    const board = makeBoard()
    expect(canPlayCard(card('9', 'clubs'), 0, 2, board)).toBe(false)
  })

  it('rejects playing on an occupied cell', () => {
    const board = makeBoard()
    placeChip(board, 0, 1, 'blue')
    expect(canPlayCard(card('9', 'clubs'), 0, 1, board)).toBe(false)
  })

  it('rejects playing on corner joker spaces', () => {
    const board = makeBoard()
    expect(canPlayCard(card('9', 'clubs'), 0, 0, board)).toBe(false)
  })

  it('rejects out-of-bounds positions', () => {
    const board = makeBoard()
    expect(canPlayCard(card('9', 'clubs'), -1, 0, board)).toBe(false)
    expect(canPlayCard(card('9', 'clubs'), 10, 0, board)).toBe(false)
  })
})

describe('playCard', () => {
  it('succeeds on a valid placement', () => {
    const board = makeBoard()
    expect(playCard(card('9', 'clubs'), 0, 1, board).success).toBe(true)
  })

  it('fails with an error message on a mismatched cell', () => {
    const board = makeBoard()
    const result = playCard(card('9', 'clubs'), 0, 2, board)
    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
  })
})

describe('wild cards', () => {
  it('two-eyed jack can be played on any empty non-corner cell', () => {
    const board = makeBoard()
    const jack = card('J', 'diamonds', 'twoEyedJack')
    expect(canPlayCard(jack, 4, 4, board)).toBe(true)
    expect(canPlayCard(jack, 0, 0, board)).toBe(false) // corner
  })

  it('wildCardAddChip rejects occupied cells and corners', () => {
    const board = makeBoard()
    placeChip(board, 2, 2, 'blue')
    expect(wildCardAddChip(2, 2, 'red', board).success).toBe(false)
    expect(wildCardAddChip(0, 0, 'red', board).success).toBe(false)
    expect(wildCardAddChip(2, 3, 'red', board).success).toBe(true)
  })

  it('wildCardRemoveChip only removes uncapped opponent chips', () => {
    const board = makeBoard()
    placeChip(board, 2, 2, 'blue')
    placeChip(board, 2, 3, 'red')
    placeChip(board, 2, 4, 'blue', true) // capped
    expect(wildCardRemoveChip(2, 2, 'blue', board).success).toBe(true)
    expect(wildCardRemoveChip(2, 3, 'blue', board).success).toBe(false) // own chip
    expect(wildCardRemoveChip(2, 4, 'blue', board).success).toBe(false) // capped
    expect(wildCardRemoveChip(5, 5, 'blue', board).success).toBe(false) // empty
  })
})

describe('burn rule', () => {
  it('a card with an open matching cell is playable and cannot be burned', () => {
    const board = makeBoard()
    const nineClubs = card('9', 'clubs')
    expect(isCardPlayable(nineClubs, board)).toBe(true)
    const result = burnCard(nineClubs, board, initializeDeck())
    expect(result.success).toBe(false)
  })

  it('a card whose board cells are all occupied can be burned', () => {
    const board = makeBoard()
    // 9 of clubs appears at (0,1) and (7,8) in the layout - occupy both
    placeChip(board, 0, 1, 'blue')
    placeChip(board, 7, 8, 'blue')
    const nineClubs = card('9', 'clubs')
    expect(isCardPlayable(nineClubs, board)).toBe(false)
    const result = burnCard(nineClubs, board, initializeDeck())
    expect(result.success).toBe(true)
    expect(result.newCard).toBeDefined()
  })

  it('burning fails when the deck is empty', () => {
    const board = makeBoard()
    placeChip(board, 0, 1, 'blue')
    placeChip(board, 7, 8, 'blue')
    const deck = initializeDeck()
    while (deck.cards.length > 0) deck.draw()
    const result = burnCard(card('9', 'clubs'), board, deck)
    expect(result.success).toBe(false)
  })
})
