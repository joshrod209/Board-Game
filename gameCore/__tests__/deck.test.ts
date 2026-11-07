/**
 * Deck creation, shuffling, drawing, and wild card identification
 */

import { describe, it, expect } from 'vitest'
import { createFullDeck, initializeDeck } from '../deck'
import { TOTAL_CARDS, JOKERS_IN_GAME } from '../constants'

describe('createFullDeck', () => {
  it('creates 108 cards (2 decks + 4 jokers)', () => {
    expect(createFullDeck()).toHaveLength(TOTAL_CARDS)
  })

  it('gives every card a unique id', () => {
    const deck = createFullDeck()
    const ids = new Set(deck.map(c => c.id))
    expect(ids.size).toBe(deck.length)
  })

  it('contains exactly 4 jokers with wildCardType "joker"', () => {
    const jokers = createFullDeck().filter(c => c.suit === 'joker')
    expect(jokers).toHaveLength(JOKERS_IN_GAME)
    expect(jokers.every(c => c.wildCardType === 'joker')).toBe(true)
  })

  it('marks jacks as two-eyed (diamonds/clubs) or one-eyed (hearts/spades)', () => {
    const jacks = createFullDeck().filter(c => c.rank === 'J')
    expect(jacks).toHaveLength(8) // 4 suits × 2 decks
    const twoEyed = jacks.filter(c => c.wildCardType === 'twoEyedJack')
    const oneEyed = jacks.filter(c => c.wildCardType === 'oneEyedJack')
    expect(twoEyed).toHaveLength(4)
    expect(oneEyed).toHaveLength(4)
    expect(twoEyed.every(c => c.suit === 'diamonds' || c.suit === 'clubs')).toBe(true)
    expect(oneEyed.every(c => c.suit === 'hearts' || c.suit === 'spades')).toBe(true)
  })
})

describe('initializeDeck', () => {
  it('shuffle preserves deck size and card set', () => {
    const deck = initializeDeck()
    const idsBefore = [...deck.cards.map(c => c.id)].sort()
    deck.shuffle()
    const idsAfter = [...deck.cards.map(c => c.id)].sort()
    expect(idsAfter).toEqual(idsBefore)
  })

  it('draw removes one card and returns it', () => {
    const deck = initializeDeck()
    const sizeBefore = deck.cards.length
    const card = deck.draw()
    expect(card).not.toBeNull()
    expect(deck.cards).toHaveLength(sizeBefore - 1)
    expect(deck.cards.some(c => c.id === card!.id)).toBe(false)
  })

  it('draw returns null when deck is empty', () => {
    const deck = initializeDeck()
    while (deck.cards.length > 0) deck.draw()
    expect(deck.draw()).toBeNull()
  })

  it('reset restores a full shuffled deck', () => {
    const deck = initializeDeck()
    for (let i = 0; i < 20; i++) deck.draw()
    deck.reset()
    expect(deck.cards).toHaveLength(TOTAL_CARDS)
  })
})
