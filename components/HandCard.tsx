'use client'

import { memo, useState } from 'react'
import Image from 'next/image'
import type { Card as CardType } from '@/gameCore/types'
import { getCardImagePath } from '@/gameCore/cardImages'

type HandCardProps = {
  card: CardType
  isSelected: boolean
  onSelect: (card: CardType) => void
  disabled?: boolean
  /** Position in the hand, used to fan the cards along an arc */
  index?: number
  count?: number
}

/** Small label telling you what a wild card does */
const WILD_LABEL: Record<string, { text: string; className: string }> = {
  twoEyedJack: { text: 'ADD', className: 'bg-blue-600' },
  oneEyedJack: { text: 'REMOVE', className: 'bg-purple-600' },
  joker: { text: 'WILD', className: 'bg-fuchsia-600' },
}

const getSuitSymbol = (suit: CardType['suit']): string => {
  switch (suit) {
    case 'hearts':
      return '♥'
    case 'diamonds':
      return '♦'
    case 'clubs':
      return '♣'
    case 'spades':
      return '♠'
    case 'joker':
      return '🃏'
    default:
      return ''
  }
}

const getSuitColor = (suit: CardType['suit']): string => {
  switch (suit) {
    case 'hearts':
    case 'diamonds':
      return 'text-red-600'
    case 'clubs':
    case 'spades':
      return 'text-black'
    case 'joker':
      return 'text-purple-600'
    default:
      return 'text-gray-600'
  }
}

function HandCard({ card, isSelected, onSelect, disabled = false, index = 0, count = 1 }: HandCardProps) {
  const [imageError, setImageError] = useState(false)
  const isJoker = card.suit === 'joker' || card.rank === 'Joker'
  const isTwoEyedJack = card.wildCardType === 'twoEyedJack'
  const isOneEyedJack = card.wildCardType === 'oneEyedJack'
  const suitColor = getSuitColor(card.suit)
  const suitSymbol = getSuitSymbol(card.suit)
  

  // Get card image path
  const cardImagePath = getCardImagePath(card)

  // Fan the hand: tilt each card away from the middle and drop the outer
  // cards a little so the hand curves like one held in real life
  const offset = index - (count - 1) / 2
  const fanStyle = {
    '--rot': `${offset * 6}deg`,
    '--arc': `${Math.abs(offset) ** 2 * 3}px`,
  } as React.CSSProperties
  const wild = card.wildCardType ? WILD_LABEL[card.wildCardType] : undefined
  const label = `${isJoker ? 'Joker' : `${card.rank} of ${card.suit}`}${
    isTwoEyedJack ? ' (Two-Eyed Jack: place a chip anywhere)' : ''
  }${isOneEyedJack ? ' (One-Eyed Jack: remove an opponent chip)' : ''}${isJoker ? ' (Joker: add or remove a chip)' : ''}`

  return (
    <button
      onClick={() => !disabled && onSelect(card)}
      disabled={disabled}
      data-selected={isSelected}
      aria-pressed={isSelected}
      aria-label={label}
      title={label}
      style={fanStyle}
      className="hand-card relative w-16 h-[90px] sm:w-20 sm:h-28 rounded-lg bg-white overflow-hidden cursor-pointer"
    >
      {/* Card image - use actual playing card image if available, fallback to styled display */}
      {!imageError ? (
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-lg">
          <Image
            src={cardImagePath}
            alt={`${card.rank} of ${card.suit === 'joker' ? 'Joker' : card.suit}`}
            width={80}
            height={112}
            className="w-full h-full rounded-lg"
            style={{ objectFit: 'cover', objectPosition: 'center center' }}
            onError={() => setImageError(true)}
            draggable={false}
            unoptimized // Allow external images or local files
          />
        </div>
      ) : (
        /* Fallback styled card (shown if image fails to load) */
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {isJoker ? (
            <div className="flex flex-col items-center justify-center w-full h-full p-1">
              <div className="text-2xl mb-0.5">🃏</div>
              <div className="text-[8px] font-bold text-purple-700 tracking-wider">JOKER</div>
            </div>
          ) : isTwoEyedJack ? (
            <div className="flex flex-col items-center justify-center w-full h-full p-0.5 relative">
              {/* Top-left rank and suit */}
              <div className={`absolute top-0.5 left-0.5 flex flex-col items-start ${suitColor} font-bold z-10`}>
                <div className="text-[8px] leading-tight font-serif font-bold">J</div>
                <div className="text-[7px] leading-tight">{suitSymbol}</div>
              </div>
              
              {/* Two-eyed jack: Face forward with both eyes visible */}
              <div className="flex flex-col items-center justify-center flex-1 pt-1">
                {/* Face representation - looking forward */}
                <div className="relative mb-1">
                  {/* Head circle - face forward */}
                  <div className="w-7 h-7 rounded-full border border-gray-300 bg-gradient-to-br from-yellow-50 to-amber-100 relative overflow-hidden shadow-sm">
                    {/* Both eyes visible (centered, face forward) */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                      <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
                      <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
                    </div>
                    {/* Nose */}
                    <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-0.5 h-0.5 bg-gray-600 rounded-full"></div>
                    {/* Crown/hat on top */}
                    <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-5 h-2 bg-red-600 rounded-t-md border border-red-700"></div>
                  </div>
                </div>
                
                {/* Suit symbol below face */}
                <div className={`text-xs ${suitColor} font-bold mb-0.5`}>{suitSymbol}</div>
                
                <div className="text-[7px] font-bold text-blue-700 tracking-tight">TWO-EYED</div>
                <div className="text-[6px] text-blue-600">JACK</div>
              </div>
              
              {/* Bottom-right rank and suit (upside down) */}
              <div className={`absolute bottom-0.5 right-0.5 flex flex-col items-end rotate-180 ${suitColor} font-bold z-10`}>
                <div className="text-[8px] leading-tight font-serif font-bold">J</div>
                <div className="text-[7px] leading-tight">{suitSymbol}</div>
              </div>
            </div>
          ) : isOneEyedJack ? (
            <div className="flex flex-col items-center justify-center w-full h-full p-0.5 relative">
              {/* Top-left rank and suit */}
              <div className={`absolute top-0.5 left-0.5 flex flex-col items-start ${suitColor} font-bold z-10`}>
                <div className="text-[8px] leading-tight font-serif font-bold">J</div>
                <div className="text-[7px] leading-tight">{suitSymbol}</div>
              </div>
              
              {/* One-eyed jack: Profile view with one eye visible */}
              <div className="flex flex-col items-center justify-center flex-1 pt-1">
                {/* Face representation - side profile (facing left) */}
                <div className="relative mb-1">
                  {/* Head circle - profile view (oval/ellipse shape) */}
                  <div className="w-8 h-7 rounded-full border border-gray-300 bg-gradient-to-br from-yellow-50 to-amber-100 relative overflow-hidden shadow-sm" style={{ borderRadius: '50% 40% 40% 50%' }}>
                    {/* One eye visible (on left side, profile view) */}
                    <div className="absolute top-2 left-2">
                      <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
                    </div>
                    {/* Nose outline (curved, indicating profile) */}
                    <div className="absolute top-3 right-2 w-1 h-1 border-r border-gray-600"></div>
                    {/* Mouth */}
                    <div className="absolute top-4.5 left-2 w-1 h-0.5 bg-gray-600 rounded-full"></div>
                    {/* Crown/hat on top (angled for profile) */}
                    <div className="absolute -top-0.5 left-1.5 w-4 h-2 bg-red-600 rounded-t-md border border-red-700 transform -rotate-12"></div>
                  </div>
                </div>
                
                {/* Suit symbol below face */}
                <div className={`text-xs ${suitColor} font-bold mb-0.5`}>{suitSymbol}</div>
                
                <div className="text-[7px] font-bold text-purple-700 tracking-tight">ONE-EYED</div>
                <div className="text-[6px] text-purple-600">JACK</div>
              </div>
              
              {/* Bottom-right rank and suit (upside down) */}
              <div className={`absolute bottom-0.5 right-0.5 flex flex-col items-end rotate-180 ${suitColor} font-bold z-10`}>
                <div className="text-[8px] leading-tight font-serif font-bold">J</div>
                <div className="text-[7px] leading-tight">{suitSymbol}</div>
              </div>
            </div>
          ) : (
            <>
              {/* Top-left rank and suit */}
              <div className={`absolute top-1 left-1 flex flex-col items-start ${suitColor} font-bold z-10`}>
                <div className="text-[10px] leading-tight font-serif">{card.rank}</div>
                <div className="text-[9px] leading-tight mt-0.5">{suitSymbol}</div>
              </div>

              {/* Center large suit symbol */}
              <div className={`text-lg ${suitColor} font-bold`}>
                {suitSymbol}
              </div>

              {/* Bottom-right rank and suit (upside down) */}
              <div className={`absolute bottom-1 right-1 flex flex-col items-end rotate-180 ${suitColor} font-bold z-10`}>
                <div className="text-[10px] leading-tight font-serif">{card.rank}</div>
                <div className="text-[9px] leading-tight mt-0.5">{suitSymbol}</div>
              </div>
            </>
          )}
        </div>
      )}
      {wild && (
        <span
          className={`absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full px-1.5 py-px text-[8px] sm:text-[9px] font-bold tracking-wide text-white shadow ${wild.className}`}
        >
          {wild.text}
        </span>
      )}
    </button>
  )
}


export default memo(HandCard)
