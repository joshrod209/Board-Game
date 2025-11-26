/**
 * Utility functions for getting card image paths
 * Assumes card images are stored in /public/cards/
 * 
 * Naming convention:
 * - Regular cards: {suit}_{rank}.png (e.g., hearts_J.png, spades_A.png)
 * - Jokers: joker_{index}.png (e.g., joker_0.png, joker_1.png)
 * 
 * For jacks, we need to distinguish:
 * - Two-eyed jacks: diamonds_J.png, clubs_J.png
 * - One-eyed jacks: hearts_J.png, spades_J.png
 */

import type { Card } from './types'

/**
 * Get the image path for a card
 * @param card - The card object
 * @returns Path to the card image
 */
export function getCardImagePath(card: Card): string {
  if (card.suit === 'joker' || card.rank === 'Joker') {
    // Extract joker index from ID (e.g., "joker-0" -> "0")
    const jokerIndex = card.id.split('-')[1] || '0'
    // Map joker indices to image files for 50/50 split:
    // 0-1 use Joker_0/Joker_1 (colored joker design)
    // 2-3 use joker_2/joker_3 (black/white joker design)
    const numIndex = parseInt(jokerIndex, 10)
    if (numIndex <= 1) {
      return `/cards/Joker_${jokerIndex}.png` // Colored jokers (capital J)
    } else {
      return `/cards/joker_${jokerIndex}.png` // Black/white jokers (lowercase j)
    }
  }
  
  // Regular cards: suit_rank.png
  // Convert rank to match filename (e.g., '10' stays '10', 'J' stays 'J')
  const rank = card.rank === '10' ? '10' : card.rank
  return `/cards/${card.suit}_${rank}.png`
}

/**
 * Get fallback image path if card image doesn't exist
 */
export function getCardFallbackPath(): string {
  return '/cards/card_back.png'
}

