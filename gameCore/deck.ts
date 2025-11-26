/**
 * Deck management for Quad Sequence
 * Standard 52-card deck × 2 = 104 cards
 */

import type { Card, Deck, Suit, Rank } from './types'

/**
 * Create a standard 52-card deck
 */
function createDeck(): Card[] {
  const suits: Suit[] = ['spades', 'hearts', 'clubs', 'diamonds']
  const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
  
  const deck: Card[] = []
  suits.forEach(suit => {
    ranks.forEach(rank => {
      deck.push({
        suit,
        rank,
        id: `${suit}-${rank}-${deck.length}`,
      })
    })
  })
  
  return deck
}

/**
 * Create a full deck (2 × 52 = 104 cards)
 */
export function createFullDeck(): Card[] {
  return [...createDeck(), ...createDeck()]
}

// Placeholder implementation
export function initializeDeck(): Deck {
  const cards = createFullDeck()
  
  return {
    cards,
    shuffle() {
      // TODO: Implement Fisher-Yates shuffle
    },
    draw() {
      // TODO: Draw and remove card from deck
      return null
    },
    reset() {
      // TODO: Reset deck to full 104 cards
    },
  }
}

