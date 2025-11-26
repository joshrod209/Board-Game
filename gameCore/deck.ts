/**
 * Deck management for Quad Sequence
 * Standard 52-card deck × 2 = 104 cards + 4 jokers = 108 cards
 */

import type { Card, Deck, Suit, Rank } from './types'

/**
 * Determine if a Jack is a two-eyed or one-eyed jack
 * Two-eyed jacks: Diamonds and Clubs (both eyes visible, facing forward)
 * One-eyed jacks: Spades and Hearts (profile view, one eye visible)
 */
function getJackWildCardType(suit: Suit): 'twoEyedJack' | 'oneEyedJack' | null {
  if (suit === 'diamonds' || suit === 'clubs') {
    return 'twoEyedJack'
  }
  if (suit === 'hearts' || suit === 'spades') {
    return 'oneEyedJack'
  }
  return null
}

/**
 * Create a standard 52-card deck
 * @param deckIndex - Index of the deck (0, 1, etc.) to ensure unique IDs
 */
function createDeck(deckIndex: number = 0): Card[] {
  const suits: Suit[] = ['spades', 'hearts', 'clubs', 'diamonds']
  const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
  
  const deck: Card[] = []
  suits.forEach(suit => {
    ranks.forEach(rank => {
      const wildCardType = rank === 'J' ? getJackWildCardType(suit) : undefined
      // Include deckIndex in ID to ensure uniqueness across multiple decks
      deck.push({
        suit,
        rank,
        id: `${suit}-${rank}-deck${deckIndex}-${deck.length}`,
        wildCardType,
      })
    })
  })
  
  return deck
}

/**
 * Create joker cards (2 jokers per deck = 4 total in 2 decks)
 * @param startIndex - Starting index for joker IDs to ensure uniqueness
 */
function createJokers(startIndex: number = 0): Card[] {
  const jokers: Card[] = []
  for (let i = 0; i < 2; i++) {
    jokers.push({
      suit: 'joker',
      rank: 'Joker',
      id: `joker-${startIndex + i}`, // Use startIndex to ensure unique IDs
      wildCardType: 'joker',
    })
  }
  return jokers
}

/**
 * Create a full deck (2 × 52 = 104 cards + 4 jokers = 108 cards)
 * All cards have unique IDs
 */
export function createFullDeck(): Card[] {
  const firstDeck = createDeck(0)
  const secondDeck = createDeck(1)
  const jokers = createJokers(0) // First 2 jokers: joker-0, joker-1
  const moreJokers = createJokers(2) // Second 2 jokers: joker-2, joker-3
  return [...firstDeck, ...secondDeck, ...jokers, ...moreJokers]
}

/**
 * Initialize a deck with shuffle, draw, and reset functionality
 */
export function initializeDeck(): Deck {
  const cards = createFullDeck()
  
  return {
    cards,
    shuffle() {
      // Fisher-Yates shuffle algorithm
      for (let i = this.cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]]
      }
    },
    draw() {
      // Draw and remove card from the end of the deck (pop for efficiency)
      return this.cards.pop() || null
    },
    reset() {
      // Reset deck to full 108 cards (104 regular + 4 jokers) and shuffle
      this.cards = [...createFullDeck()]
      this.shuffle()
    },
  }
}

