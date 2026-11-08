'use client'

import type { Card } from '@/gameCore/types'
import { getCardImagePath } from '@/gameCore/cardImages'

type PileStripProps = {
  discardPile: Card[]
  deckCount: number
  /** Open the full discard pile */
  onOpen: () => void
  /** Show Shuffle & Deal (deck empty or every hand empty) */
  showShuffle?: boolean
  onShuffle?: () => void
  shuffleDisabled?: boolean
}

/**
 * Compact deck + discard pile that sits inside the hand box. Always
 * visible; tapping the discard opens the full pile.
 */
export default function PileStrip({ discardPile, deckCount, onOpen, showShuffle, onShuffle, shuffleDisabled }: PileStripProps) {
  const top = discardPile[0]
  const label = top
    ? top.suit === 'joker'
      ? 'Joker'
      : `${top.rank} of ${top.suit}`
    : null

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onOpen}
        className="group flex items-center gap-2 rounded-md px-1 py-0.5 text-left hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400"
        title={top ? `Discard pile: ${discardPile.length} card${discardPile.length === 1 ? '' : 's'}, top is ${label}. Tap to see them all.` : 'Discard pile is empty'}
        aria-label={top ? `Open discard pile (${discardPile.length} card${discardPile.length === 1 ? '' : 's'}, top card ${label})` : 'Open discard pile (empty)'}
      >
        <span className="relative">
          {top ? (
            <>
              {discardPile.length > 1 && (
                <span className="absolute inset-0 translate-x-0.5 translate-y-0.5 rotate-3 rounded bg-white/70" aria-hidden />
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getCardImagePath(top)}
                alt=""
                draggable={false}
                className="relative block h-8 w-6 rounded-sm object-cover shadow ring-1 ring-black/20 transition-transform group-hover:-translate-y-0.5"
              />
              <span className="absolute -right-1.5 -top-1.5 min-w-[1.1rem] rounded-full bg-blue-600 px-1 text-center text-[9px] font-bold leading-4 text-white shadow">
                {discardPile.length}
              </span>
            </>
          ) : (
            <span className="block h-8 w-6 rounded-sm border border-dashed border-gray-600" aria-hidden />
          )}
        </span>
        <span className="text-[11px] leading-tight">
          <span className="font-semibold text-gray-300 group-hover:text-white">Discard</span>
          <span className="text-gray-500"> · Deck {deckCount}</span>
        </span>
      </button>
      {showShuffle && (
        <button
          onClick={onShuffle}
          disabled={shuffleDisabled}
          className="rounded bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
          title="Shuffle the deck and deal 5 cards to each player"
        >
          🔀 Shuffle &amp; Deal
        </button>
      )}
    </div>
  )
}
