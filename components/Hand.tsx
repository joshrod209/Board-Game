'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Card } from '@/gameCore/types'
import HandCard from './HandCard'
import { useHandOrder } from './useHandOrder'

/** How far a press must travel sideways before it becomes a drag */
const DRAG_START_PX = 6
/** Remembered once someone closes the tips screen */
const TIPS_KEY = 'qs-tips-seen'

type HandProps = {
  hand: { cards: Card[] } | null
  /** Heading override, e.g. "Your hand" in online games */
  title?: string
  selectedCardId: string | null
  onCardSelect: (card: Card) => void
  onBurnCard?: () => void
  onJokerActionSelect?: (action: 'add' | 'remove') => void
  disabled?: boolean
  playerColor: 'red' | 'blue'
  canBurn?: boolean // Show the Burn button (your turn and the deck has cards); the player decides what to burn
  hasBurned?: boolean // Whether player has already burned this turn
  selectedCard?: Card | null // The actual selected card object (to check wild card type)
  jokerActionMode?: 'add' | 'remove' | null // Current joker action mode
  canPass?: boolean // No regular card can be played, so the player may pass
  onPass?: () => void
  /** Whose arrangement this is (each player keeps their own card order) */
  orderKey?: string
  /** Keep the arrangement across page refreshes */
  persistOrder?: boolean
  /** Extra buttons for the action row (e.g. Cap a score); always shown */
  actions?: React.ReactNode
  /** Replaces the usual hints, e.g. capping instructions */
  notice?: React.ReactNode
  /** Deck and discard pile, shown in the bottom row of the box */
  pile?: React.ReactNode
}

type DragState = {
  id: string
  pointerId: number
  startX: number
  startY: number
  grabOffset: number
  started: boolean
}

export default function Hand({ 
  hand, 
  selectedCardId, 
  onCardSelect, 
  onBurnCard,
  onJokerActionSelect,
  disabled = false, 
  playerColor,
  canBurn = false,
  hasBurned = false,
  selectedCard,
  jokerActionMode = null,
  title,
  canPass = false,
  onPass,
  orderKey = playerColor,
  persistOrder = false,
  actions,
  notice,
  pile,
}: HandProps) {
  const cards = hand?.cards ?? EMPTY
  const { ordered, move, wildsToEnd } = useHandOrder(cards, orderKey, persistOrder)

  const fanRef = useRef<HTMLDivElement>(null)
  const slotRefs = useRef(new Map<string, HTMLDivElement>())
  const drag = useRef<DragState | null>(null)
  const pointerX = useRef(0)
  const suppressClickUntil = useRef(0)
  // Slot positions just before a reorder, so the other cards can slide (FLIP)
  const beforeMove = useRef<Map<string, number> | null>(null)
  // The drag listeners live on window for the whole drag, so they read the
  // latest order and move function through refs instead of stale closures
  const orderedRef = useRef(ordered)
  orderedRef.current = ordered
  const moveRef = useRef(move)
  moveRef.current = move
  const selectedIdRef = useRef(selectedCardId)
  selectedIdRef.current = selectedCardId
  const onSelectRef = useRef(onCardSelect)
  onSelectRef.current = onCardSelect

  const slotLeft = (el: HTMLDivElement) => el.offsetLeft

  /** Keep the dragged card under the pointer */
  const followPointer = useCallback(() => {
    const d = drag.current
    const fan = fanRef.current
    const el = d && slotRefs.current.get(d.id)
    if (!d?.started || !fan || !el) return
    const fanLeft = fan.getBoundingClientRect().left
    const dx = pointerX.current - fanLeft - d.grabOffset - slotLeft(el)
    el.style.transform = `translateX(${dx}px)`
  }, [])

  // After a reorder: slide the other cards from where they were (FLIP)
  useLayoutEffect(() => {
    const before = beforeMove.current
    beforeMove.current = null
    if (before) {
      slotRefs.current.forEach((el, id) => {
        if (id === drag.current?.id) return
        const old = before.get(id)
        if (old === undefined) return
        const delta = old - slotLeft(el)
        if (!delta) return
        el.style.transition = 'none'
        el.style.transform = `translateX(${delta}px)`
        requestAnimationFrame(() => {
          el.style.transition = 'transform 0.18s ease'
          el.style.transform = ''
        })
      })
    }
    followPointer()
  }, [ordered, followPointer])

  const moveWithAnimation = useCallback((id: string, toIndex: number) => {
    const positions = new Map<string, number>()
    slotRefs.current.forEach((el, key) => positions.set(key, slotLeft(el)))
    beforeMove.current = positions
    moveRef.current(id, toIndex)
  }, [])

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const d = drag.current
      if (!d || e.pointerId !== d.pointerId) return
      pointerX.current = e.clientX
      if (!d.started) {
        const dx = Math.abs(e.clientX - d.startX)
        const dy = Math.abs(e.clientY - d.startY)
        if (dy > DRAG_START_PX && dy > dx) {
          drag.current = null // a vertical swipe: let the page scroll
          return
        }
        if (dx < DRAG_START_PX) return
        d.started = true
        slotRefs.current.get(d.id)?.setAttribute('data-dragging', 'true')
      }
      // Where would the card land? Count the other cards whose middle is left
      // of the pointer, using their resting spots (not mid-slide positions)
      const fanLeft = fanRef.current?.getBoundingClientRect().left ?? 0
      const others = orderedRef.current.filter(c => c.id !== d.id)
      let target = 0
      for (const c of others) {
        const el = slotRefs.current.get(c.id)
        if (el && fanLeft + slotLeft(el) + el.offsetWidth / 2 < e.clientX) target++
      }
      const current = orderedRef.current.findIndex(c => c.id === d.id)
      if (target !== current) moveWithAnimation(d.id, target)
      else followPointer()
    },
    [followPointer, moveWithAnimation]
  )

  const endDrag = useCallback(
    (e: PointerEvent) => {
      const d = drag.current
      if (!d || e.pointerId !== d.pointerId) return
      drag.current = null
      window.removeEventListener('pointermove', onPointerMove)
      if (!d.started) return
      const el = slotRefs.current.get(d.id)
      if (el) {
        el.removeAttribute('data-dragging')
        el.style.transition = 'transform 0.15s ease'
        el.style.transform = ''
        // The mouse is still over the card; don't let hover lift it again
        el.setAttribute('data-just-moved', 'true')
        el.addEventListener('pointerleave', () => el.removeAttribute('data-just-moved'), { once: true })
      }
      // The pointerup is followed by a click (later on touch screens); don't
      // let it select the card
      suppressClickUntil.current = performance.now() + 400
      // A card that was just moved goes back to resting, even if it was selected
      if (selectedIdRef.current === d.id) {
        const card = orderedRef.current.find(c => c.id === d.id)
        if (card) onSelectRef.current(card)
      }
    },
    [onPointerMove]
  )

  useEffect(() => {
    window.addEventListener('pointerup', endDrag)
    window.addEventListener('pointercancel', endDrag)
    return () => {
      window.removeEventListener('pointerup', endDrag)
      window.removeEventListener('pointercancel', endDrag)
      window.removeEventListener('pointermove', onPointerMove)
    }
  }, [endDrag, onPointerMove])

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>, id: string) => {
    if (e.button !== 0) return
    const el = slotRefs.current.get(id)
    if (!el) return
    drag.current = {
      id,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      grabOffset: e.clientX - el.getBoundingClientRect().left,
      started: false,
    }
    pointerX.current = e.clientX
    window.addEventListener('pointermove', onPointerMove)
  }

  /** Alt + Left/Right arrow moves the focused card */
  const onKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (!e.altKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return
    e.preventDefault()
    const index = ordered.findIndex(c => c.id === id)
    moveWithAnimation(id, index + (e.key === 'ArrowLeft' ? -1 : 1))
  }

  const wildCount = ordered.filter(c => c.wildCardType).length
  const wildsAlreadyLast = ordered.slice(ordered.length - wildCount).every(c => c.wildCardType)

  // Tips screen: shown automatically the first time, then from the "Tips" button
  const [showTips, setShowTips] = useState(false)
  useEffect(() => {
    try {
      if (!localStorage.getItem(TIPS_KEY)) setShowTips(true)
    } catch {
      // Storage unavailable: skip the automatic tips
    }
  }, [])
  const closeTips = () => {
    setShowTips(false)
    try {
      localStorage.setItem(TIPS_KEY, '1')
    } catch {
      // ignore
    }
  }

  if (!hand || hand.cards.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 lp:p-1.5 space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className={`text-sm font-bold lp:hidden ${playerColor === 'red' ? 'text-red-400' : 'text-blue-400'}`}>
            {title ?? `${playerColor.toUpperCase()} Player's Hand`}
          </h3>
          <div className="flex flex-wrap justify-end gap-2">
            {actions}
            {canPass && onPass && !disabled && (
              <button
                onClick={onPass}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs font-semibold rounded transition-colors"
              >
                ⏭ Pass turn
              </button>
            )}
          </div>
        </div>
        {notice ?? <div className="text-gray-300 text-sm text-center">No cards in hand</div>}
        {pile && <div className="flex items-center gap-3 border-t border-white/5 pt-2 text-gray-500">{pile}</div>}
      </div>
    )
  }

  return (
    <div className="relative bg-gray-800 rounded-lg p-4 lp:p-1.5">
      {showTips && (
        <div
          className="absolute lp:fixed inset-0 z-50 flex items-center justify-center rounded-lg bg-gray-950/70 p-3 backdrop-blur-[1px]"
          role="dialog"
          aria-label="Tips"
        >
          <div className="w-full max-w-sm rounded-xl border border-white/10 bg-gray-900 p-4 shadow-2xl animate-slideUp">
            <h4 className="text-sm font-bold text-white">Quick tips</h4>
            <ul className="mt-2 space-y-1.5 text-xs text-gray-300">
              <li>👆 Tap a card, then tap a matching square to play it.</li>
              <li>↔️ Drag cards left or right to rearrange your hand.</li>
              <li>⇢ <span className="font-semibold">Wilds to the end</span> moves your Jacks and Jokers to the right.</li>
              <li>🔥 <span className="font-semibold">Burn</span> swaps a card that can&apos;t be played anywhere (once per turn).</li>
              <li>🎯 <span className="font-semibold">Cap a score</span>, then tap the 5 squares of your line.</li>
            </ul>
            <div className="mt-3 flex justify-end">
              <button
                onClick={closeTips}
                autoFocus
                className="rounded-lg bg-yellow-500 px-4 py-1.5 text-sm font-semibold text-gray-900 hover:bg-yellow-400"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="mb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className={`text-sm font-bold lp:hidden ${playerColor === 'red' ? 'text-red-400' : 'text-blue-400'}`}>
            {title ?? `${playerColor.toUpperCase()} Player's Hand`}
          </h3>
          <div className="flex flex-wrap justify-end gap-2">
            {actions}
            {/* Joker action buttons */}
            {selectedCard?.wildCardType === 'joker' && !jokerActionMode && !disabled && (
              <>
                <button
                  onClick={() => onJokerActionSelect?.('add')}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded transition-colors"
                  title="Add your chip anywhere on the board"
                >
                  ➕ Add Chip
                </button>
                <button
                  onClick={() => onJokerActionSelect?.('remove')}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded transition-colors"
                  title="Remove opponent's uncapped chip"
                >
                  ➖ Remove Chip
                </button>
              </>
            )}
            {/* Pass button: no regular card fits; wild cards are optional */}
            {canPass && onPass && !disabled && (
              <button
                onClick={onPass}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs font-semibold rounded transition-colors"
                title="None of your regular cards can be played. End your turn without playing."
              >
                ⏭ Pass turn
              </button>
            )}
            {/* Burn: the player chooses a dead card and burns it (once per turn) */}
            {onBurnCard && canBurn && !disabled && (
              <button
                onClick={onBurnCard}
                disabled={!selectedCardId || hasBurned}
                className="px-3 py-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-xs font-semibold rounded transition-colors"
                title={
                  hasBurned
                    ? 'You already burned a card this turn'
                    : selectedCardId
                      ? 'Burn the selected card (only a card that can\'t be played anywhere) and draw a new one'
                      : 'Select a card that can\'t be played anywhere, then burn it to draw a new one'
                }
              >
                🔥 Burn
              </button>
            )}
          </div>
        </div>
        {notice ? (
          <div className="mt-1">{notice}</div>
        ) : (
          <>
        {selectedCardId && (
          <div className="mt-1">
            <p className="text-xs text-yellow-400">
              ✓ Card selected: {selectedCard?.rank} of {selectedCard?.suit === 'joker' ? 'Joker' : selectedCard?.suit}
              {selectedCard?.wildCardType === 'twoEyedJack' && (
                <span className="ml-2 text-blue-400">👀👀 Two-Eyed Jack (Place chip anywhere)</span>
              )}
              {selectedCard?.wildCardType === 'oneEyedJack' && (
                <span className="ml-2 text-purple-400">👁️ One-Eyed Jack (Remove opponent chip)</span>
              )}
              {selectedCard?.wildCardType === 'joker' && (
                <span className="ml-2 text-purple-400">🃏 Joker ({jokerActionMode ? (jokerActionMode === 'add' ? 'Add chip' : 'Remove chip') : 'Choose action'})</span>
              )}
            </p>
            {selectedCard?.wildCardType !== 'joker' && (
              <p className="text-xs text-gray-400 mt-1 lp:hidden">
                Click a board cell to play
              </p>
            )}
            {selectedCard?.wildCardType === 'joker' && jokerActionMode && (
              <p className="text-xs text-gray-400 mt-1">
                Mode: {jokerActionMode === 'add' ? 'Add your chip' : 'Remove opponent chip'} - Click a board cell to play
              </p>
            )}
            {selectedCard?.wildCardType === 'joker' && !jokerActionMode && (
              <p className="text-xs text-orange-400 mt-1">
                Choose an action above (Add or Remove) before clicking a board cell
              </p>
            )}
          </div>
        )}
        {canPass && onPass && !disabled && (
          <p className="text-xs text-gray-300 mt-1">
            No regular card fits on the board. {hasBurned ? '' : 'You can burn a dead card (select it first), '}
            {hand.cards.some(c => c.wildCardType) ? 'use a wild card, or pass.' : 'or pass.'}
          </p>
        )}
        {hasBurned && (
          <p className="text-xs text-gray-500 mt-1 italic lp:hidden">
            You have already burned a card this turn
          </p>
        )}
        {!selectedCardId && !disabled && (
          <p className="text-xs text-gray-400 mt-1 lp:hidden">
            Select a card from your hand to play
          </p>
        )}
        {disabled && (
          <p className="text-xs text-gray-500 mt-1 italic lp:hidden">
            Card selection disabled
          </p>
        )}
          </>
        )}
      </div>
      <div
        ref={fanRef}
        className="hand-fan relative flex justify-center"
        role="group"
        aria-label="Your cards (drag to rearrange)"
        onClickCapture={e => {
          if (performance.now() < suppressClickUntil.current) {
            e.stopPropagation()
            e.preventDefault()
          }
        }}
      >
        {ordered.map((card, i) => (
          <div
            key={card.id}
            ref={el => {
              if (el) slotRefs.current.set(card.id, el)
              else slotRefs.current.delete(card.id)
            }}
            className={`hand-slot ${i === 0 ? '' : '-ml-3 sm:-ml-4 lp:-ml-2'}`}
            style={{ '--delay': `${i * 60}ms` } as React.CSSProperties}
            onPointerDown={e => onPointerDown(e, card.id)}
            // Stop the browser's own image drag, which would hijack the gesture
            onDragStart={e => e.preventDefault()}
            onKeyDown={e => onKeyDown(e, card.id)}
          >
            <HandCard
              card={card}
              isSelected={selectedCardId === card.id}
              onSelect={onCardSelect}
              disabled={disabled}
              index={i}
              count={ordered.length}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 lp:gap-1 border-t border-white/5 pt-1.5 text-[11px] text-gray-500">
        <div className="flex min-w-0 items-center gap-3">{pile}</div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => setShowTips(true)}
            className="rounded px-2 py-0.5 text-gray-400 hover:bg-gray-700 hover:text-white"
            title="Show tips"
            aria-label="Show tips"
          >
            ?<span className="lp:hidden"> Tips</span>
          </button>
        {wildCount > 0 && wildCount < ordered.length && (
          <button
            onClick={wildsToEnd}
            disabled={wildsAlreadyLast}
            className="rounded px-2 py-0.5 text-gray-300 hover:text-white hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-transparent"
            title="Move your Jacks and Jokers to the right side of your hand"
          >
            Wilds<span className="lp:hidden"> to the end</span> ⇢
          </button>
        )}
        </div>
      </div>
    </div>
  )
}

const EMPTY: Card[] = []
