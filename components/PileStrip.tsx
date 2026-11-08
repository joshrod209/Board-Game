'use client'

import { useState } from 'react'
import type { DiscardedCard } from '@/gameCore/types'
import { getCardImagePath } from '@/gameCore/cardImages'
import DiscardPileView from './DiscardPileView'

export type PilePlayer = { id: string; name: string; team: 'red' | 'blue' }

type PileStripProps = {
  /** One discard stack per player, in this order */
  players: PilePlayer[]
  discardPile: DiscardedCard[]
  deckCount: number
  /** Show Shuffle & Deal (deck empty or every hand empty) */
  showShuffle?: boolean
  onShuffle?: () => void
  shuffleDisabled?: boolean
}

const CARD_SIZE = 'h-8 w-6 lp:h-7 lp:w-5'
const TEAM_TAG = { red: 'bg-red-600', blue: 'bg-blue-600' }

/** One player's discards, face up with the newest on top */
function Stack({ player, cards, onOpen }: { player: PilePlayer; cards: DiscardedCard[]; onOpen: () => void }) {
  const top = cards[0]
  const count = cards.length
  const summary = `${player.name}'s discards, ${count} card${count === 1 ? '' : 's'}`
  return (
    <button
      onClick={onOpen}
      disabled={count === 0}
      title={summary}
      aria-label={count ? `${summary}. Show them.` : summary}
      className="group relative shrink-0 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400"
    >
      {count > 2 && <span className="absolute inset-0 -translate-x-0.5 -rotate-6 rounded-sm bg-white/50" aria-hidden />}
      {count > 1 && <span className="absolute inset-0 translate-x-0.5 rotate-6 rounded-sm bg-white/75" aria-hidden />}
      {top ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={getCardImagePath(top)}
          alt=""
          draggable={false}
          className={`relative block rounded-sm object-cover shadow ring-1 ring-black/20 transition-transform group-hover:-translate-y-0.5 ${CARD_SIZE}`}
        />
      ) : (
        <span className={`block rounded-sm border border-dashed border-gray-600 ${CARD_SIZE}`} aria-hidden />
      )}
      {count > 0 && (
        <span className="absolute -right-1.5 -top-1.5 min-w-[1rem] rounded-full bg-gray-950 px-0.5 text-center text-[9px] font-bold leading-4 text-white shadow">
          {count}
        </span>
      )}
      {/* Whose stack this is */}
      <span
        className={`absolute -bottom-1 left-1/2 -translate-x-1/2 rounded px-1 text-[9px] font-bold uppercase leading-3 text-white shadow ${TEAM_TAG[player.team]}`}
        aria-hidden
      >
        {player.name.charAt(0)}
      </span>
    </button>
  )
}

/**
 * Deck count and a discard stack for each player, inside the hand box.
 * Tapping a stack spreads that player's cards.
 */
export default function PileStrip({ players, discardPile, deckCount, showShuffle, onShuffle, shuffleDisabled }: PileStripProps) {
  const [openId, setOpenId] = useState<string | null>(null)
  const cardsOf = (id: string) => discardPile.filter(c => c.playedBy === id)
  const open = players.find(p => p.id === openId)

  return (
    <>
      <div className="flex items-center gap-3 lp:gap-2.5 pb-1">
        {players.map(p => (
          <Stack key={p.id} player={p} cards={cardsOf(p.id)} onOpen={() => setOpenId(p.id)} />
        ))}
      </div>
      <span className="whitespace-nowrap text-[11px] leading-tight text-gray-500">Deck {deckCount}</span>
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
      {open && <DiscardPileView player={open} cards={cardsOf(open.id)} onClose={() => setOpenId(null)} />}
    </>
  )
}
