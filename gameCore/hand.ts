/**
 * Player hand management
 */

import type { Card, Hand, Player } from './types'

/**
 * Create a new hand
 */
export function createHand(): Hand {
  return {
    cards: [],
    addCard(card: Card) {
      // TODO: Add card to hand
      this.cards.push(card)
    },
    removeCard(cardId: string) {
      // TODO: Remove card from hand by ID
      const index = this.cards.findIndex(c => c.id === cardId)
      if (index !== -1) {
        return this.cards.splice(index, 1)[0]
      }
      return null
    },
    hasCard(cardId: string) {
      // TODO: Check if hand contains card
      return this.cards.some(c => c.id === cardId)
    },
  }
}

// Placeholder for player management
export function createPlayer(id: string, name: string, color: Player['color']): Player {
  return {
    id,
    name,
    hand: createHand(),
    color,
  }
}

