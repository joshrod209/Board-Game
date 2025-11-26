'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { Card } from '@/gameCore/types'
import { getCardImagePath } from '@/gameCore/cardImages'

type DiscardPileProps = {
  discardPile: Card[]
  onClick?: () => void
}

export default function DiscardPile({ discardPile, onClick }: DiscardPileProps) {
  const [imageError, setImageError] = useState(false)
  const topCard = discardPile[0] // Most recent card (first in array)
  const cardCount = discardPile.length

  // If no cards in discard pile, show empty state
  if (!topCard) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 flex flex-col items-center justify-center min-w-[80px] min-h-[112px] border-2 border-gray-600 border-dashed">
        <div className="text-gray-500 text-xs text-center">
          Discard Pile
        </div>
        <div className="text-gray-600 text-xs mt-1">
          Empty
        </div>
      </div>
    )
  }

  const cardImagePath = getCardImagePath(topCard)
  const isJoker = topCard.suit === 'joker' || topCard.rank === 'Joker'
  
  // Extract joker index for sizing (similar to HandCard)
  const jokerIndex = isJoker ? parseInt(topCard.id.split('-')[1] || '0', 10) : -1
  const isColoredJoker = isJoker && (jokerIndex === 0 || jokerIndex === 1)

  return (
    <button
      onClick={onClick}
      className="relative bg-gray-800 rounded-lg p-2 flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition-all duration-200 group border-2 border-gray-700 hover:border-gray-600"
      title={cardCount > 1 ? `Discard Pile: ${cardCount} cards. Click to view all.` : 'Discard Pile: Click to view'}
    >
      {/* Stack effect - show multiple card shadows if more than one card */}
      {cardCount > 1 && (
        <>
          {/* Second card shadow */}
          <div 
            className="absolute w-16 h-24 rounded-lg bg-white border-2 border-gray-400 opacity-50"
            style={{ 
              transform: 'translate(2px, 2px) rotate(1deg)',
              zIndex: 1
            }}
          />
          {/* Third card shadow (if many cards) */}
          {cardCount > 2 && (
            <div 
              className="absolute w-16 h-24 rounded-lg bg-white border-2 border-gray-400 opacity-30"
              style={{ 
                transform: 'translate(4px, 4px) rotate(2deg)',
                zIndex: 2
              }}
            />
          )}
        </>
      )}

      {/* Top card display */}
      <div className="relative w-16 h-24 rounded-lg bg-white border-2 border-gray-400 overflow-hidden shadow-lg z-10 group-hover:shadow-xl transition-shadow duration-200">
        {!imageError ? (
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-lg">
            <Image
              src={cardImagePath}
              alt={`${topCard.rank} of ${topCard.suit === 'joker' ? 'Joker' : topCard.suit}`}
              width={64}
              height={96}
              className="w-full h-full rounded-lg"
              style={isJoker ? {
                objectFit: 'cover',
                objectPosition: 'center center',
                transform: isColoredJoker ? 'scale(1.12)' : 'scale(1.08)',
              } : {
                objectFit: 'cover',
                objectPosition: 'center center',
              }}
              onError={() => setImageError(true)}
              unoptimized
            />
          </div>
        ) : (
          /* Fallback styled card */
          <div className="absolute inset-0 flex flex-col items-center justify-center p-1">
            {isJoker ? (
              <div className="flex flex-col items-center justify-center w-full h-full">
                <div className="text-xl">🃏</div>
                <div className="text-[8px] font-bold text-purple-700">JOKER</div>
              </div>
            ) : (
              <>
                <div className="text-[8px] font-bold">{topCard.rank}</div>
                <div className="text-xs">
                  {topCard.suit === 'hearts' ? '♥' : 
                   topCard.suit === 'diamonds' ? '♦' :
                   topCard.suit === 'clubs' ? '♣' : '♠'}
                </div>
              </>
            )}
          </div>
        )}
        
        {/* Slight dimming to indicate it's a discarded card */}
        <div className="absolute inset-0 bg-black/10 rounded-lg" />
      </div>

      {/* Card count badge */}
      {cardCount > 1 && (
        <div className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-md z-20 group-hover:scale-110 group-hover:bg-blue-500 transition-all duration-200 animate-pulse">
          {cardCount > 99 ? '99+' : cardCount}
        </div>
      )}

      {/* Label */}
      <div className="text-gray-400 text-xs mt-2 text-center">
        Discard Pile
      </div>
    </button>
  )
}

