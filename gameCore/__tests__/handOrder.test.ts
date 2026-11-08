import { describe, it, expect } from 'vitest'
import type { Card } from '../types'
import { arrangeHand } from '../hand'

const card = (id: string) => ({ id }) as Card
const hand = (...ids: string[]) => ids.map(card)
const ids = (cards: Card[]) => cards.map(c => c.id)

describe('arrangeHand', () => {
  it('uses the dealt order until there is a saved order', () => {
    expect(ids(arrangeHand(hand('a', 'b', 'c'), undefined))).toEqual(['a', 'b', 'c'])
  })

  it('puts a newly drawn card in slot 1 and keeps the others in place', () => {
    // The game appends the drawn card; the player had arranged c, a, b
    expect(ids(arrangeHand(hand('a', 'c', 'd'), ['c', 'b', 'a']))).toEqual(['d', 'c', 'a'])
  })

  it('keeps earlier new cards in their slots over several turns', () => {
    let saved = ['c', 'b', 'a']
    saved = ids(arrangeHand(hand('a', 'c', 'd'), saved)) // played b, drew d
    expect(saved).toEqual(['d', 'c', 'a'])
    saved = ids(arrangeHand(hand('a', 'd', 'e'), saved)) // played c, drew e
    expect(saved).toEqual(['e', 'd', 'a'])
  })

  it('does not change the order when the hand is the same', () => {
    expect(ids(arrangeHand(hand('a', 'b', 'c'), ['b', 'c', 'a']))).toEqual(['b', 'c', 'a'])
  })
})
