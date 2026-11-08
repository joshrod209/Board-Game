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

/**
 * Lay a hand out in the player's saved order. Newly drawn cards (not in the
 * saved order yet) go first, into slot 1; the rest keep their places, and
 * cards no longer in the hand drop out. Display only: the game never sees this.
 */
export function arrangeHand(cards: Card[], saved: string[] | undefined): Card[] {
  if (!saved) return cards
  const byId = new Map(cards.map(c => [c.id, c]))
  const kept = saved.filter(id => byId.has(id)).map(id => byId.get(id)!)
  const keptIds = new Set(kept.map(c => c.id))
  return [...cards.filter(c => !keptIds.has(c.id)), ...kept]
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

