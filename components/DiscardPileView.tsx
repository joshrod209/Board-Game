'use client'

import type { DiscardedCard } from '@/gameCore/types'
import { getCardImagePath } from '@/gameCore/cardImages'
import type { PilePlayer } from './PileStrip'

type DiscardPileViewProps = {
  player: PilePlayer
  /** That player's discards, most recent first */
  cards: DiscardedCard[]
  onClose: () => void
}

/** Spreads one player's discards out in a row, newest on the left */
export default function DiscardPileView({ player, cards, onClose }: DiscardPileViewProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm safe-overlay animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-label={`${player.name}'s discards`}
    >
      <div
        className="w-full max-w-2xl rounded-lg border border-gray-600 bg-gray-800 p-3 sm:p-4 lp:p-2 shadow-2xl animate-slideUp"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className={`text-sm sm:text-base font-bold ${player.team === 'red' ? 'text-red-400' : 'text-blue-400'}`}>
            {player.name}&apos;s discards ({cards.length})
          </h2>
          <button onClick={onClose} className="px-2 text-2xl leading-none text-gray-400 hover:text-white" aria-label="Close">
            ×
          </button>
        </div>
        <div className="mt-2 overflow-x-auto">
          <ol className="mx-auto flex w-max gap-2 px-0.5 pb-1">
            {cards.map((card, i) => (
              <li key={card.id} className="spread-card" style={{ '--delay': `${Math.min(i, 10) * 35}ms` } as React.CSSProperties}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getCardImagePath(card)}
                  alt={card.suit === 'joker' ? 'Joker' : `${card.rank} of ${card.suit}`}
                  draggable={false}
                  className="block h-[90px] w-16 sm:h-28 sm:w-20 lp:h-[84px] lp:w-[60px] rounded-md object-cover shadow-md"
                />
                <div className="mt-1 h-3 text-center text-[10px] leading-3 text-gray-400">{i === 0 ? 'Latest' : ''}</div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}
