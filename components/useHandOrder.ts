'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Card } from '@/gameCore/types'

/**
 * Lay the cards out in the saved order: cards the player arranged first (in
 * their order), then any new cards on the right. Cards no longer in the hand
 * simply drop out.
 */
function arrange(cards: Card[], saved: string[] | undefined): Card[] {
  if (!saved) return cards
  const byId = new Map(cards.map(c => [c.id, c]))
  const kept = saved.filter(id => byId.has(id)).map(id => byId.get(id)!)
  const keptIds = new Set(kept.map(c => c.id))
  return [...kept, ...cards.filter(c => !keptIds.has(c.id))]
}

/**
 * Remembers how a player has arranged their hand. Display only: the game
 * itself never sees this order.
 *
 * Each `orderKey` (a player) keeps its own order, so in pass-and-play Red and
 * Blue don't share one. With `persist`, it survives a page refresh.
 */
export function useHandOrder(cards: Card[], orderKey: string, persist = false) {
  const storageKey = `qs-hand-order:${orderKey}`
  const [orders, setOrders] = useState<Record<string, string[]>>({})
  const saved = orders[orderKey]

  // Load a saved order the first time we see this player
  useEffect(() => {
    if (!persist || saved) return
    try {
      const raw = sessionStorage.getItem(storageKey)
      if (raw) setOrders(o => (o[orderKey] ? o : { ...o, [orderKey]: JSON.parse(raw) }))
    } catch {
      // Storage unavailable (private mode): the order just won't survive a refresh
    }
  }, [orderKey, persist, storageKey, saved])

  // Save whenever the arrangement changes
  useEffect(() => {
    if (!persist || !saved) return
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(saved))
    } catch {
      // ignore
    }
  }, [persist, saved, storageKey])

  const ordered = useMemo(() => arrange(cards, saved), [cards, saved])

  /**
   * Move a card to a new position. Works from the latest order even if
   * several moves happen before the next render (fast drags).
   */
  const move = useCallback(
    (cardId: string, toIndex: number) => {
      setOrders(o => {
        const ids = arrange(cards, o[orderKey]).map(c => c.id)
        const from = ids.indexOf(cardId)
        if (from < 0) return o
        const to = Math.max(0, Math.min(toIndex, ids.length - 1))
        if (to === from) return o
        ids.splice(from, 1)
        ids.splice(to, 0, cardId)
        return { ...o, [orderKey]: ids }
      })
    },
    [cards, orderKey]
  )

  /** Put every Jack and Joker on the right, keeping everything else in order */
  const wildsToEnd = useCallback(() => {
    setOrders(o => {
      const list = arrange(cards, o[orderKey])
      return { ...o, [orderKey]: [...list.filter(c => !c.wildCardType), ...list.filter(c => c.wildCardType)].map(c => c.id) }
    })
  }, [cards, orderKey])

  return { ordered, move, wildsToEnd }
}
