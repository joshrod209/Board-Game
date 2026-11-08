'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Card } from '@/gameCore/types'
import { arrangeHand as arrange } from '@/gameCore/hand'

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

  // Record each hand change, so a card drawn earlier keeps its slot once the
  // next new card arrives. Must stay after the load above: both updates run in
  // order, so this one sees the loaded arrangement. A momentarily empty hand
  // is skipped so it can't wipe a saved order.
  useEffect(() => {
    if (cards.length === 0) return
    setOrders(o => {
      const prev = o[orderKey]
      const ids = arrange(cards, prev).map(c => c.id)
      const unchanged = prev?.length === ids.length && ids.every((id, i) => id === prev[i])
      return unchanged ? o : { ...o, [orderKey]: ids }
    })
  }, [cards, orderKey])

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
