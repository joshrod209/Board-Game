'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { Card } from '@/gameCore/types'
import { getCardImagePath } from '@/gameCore/cardImages'

type DiscardPileViewProps = {
  discardPile: Card[]
  isOpen: boolean
  onClose: () => void
}

// Helper functions for card display
const getSuitSymbol = (suit: Card['suit']): string => {
  switch (suit) {
    case 'hearts': return '♥'
    case 'diamonds': return '♦'
    case 'clubs': return '♣'
    case 'spades': return '♠'
    case 'joker': return '🃏'
    default: return ''
  }
}

const getSuitColor = (suit: Card['suit']): string => {
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

// Individual card component for the discard pile view
function DiscardCardItem({ card, index }: { card: Card; index: number }) {
  const [imageError, setImageError] = useState(false)
  const cardImagePath = getCardImagePath(card)
  const isJoker = card.suit === 'joker' || card.rank === 'Joker'
  
  // Extract joker index for sizing
  const jokerIndex = isJoker ? parseInt(card.id.split('-')[1] || '0', 10) : -1
  const isColoredJoker = isJoker && (jokerIndex === 0 || jokerIndex === 1)

  // Determine wild card type for display
  const isTwoEyedJack = card.wildCardType === 'twoEyedJack'
  const isOneEyedJack = card.wildCardType === 'oneEyedJack'

  const suitColor = getSuitColor(card.suit)
  const suitSymbol = getSuitSymbol(card.suit)

  return (
    <div className="relative group">
      {/* Card display */}
      <div className="relative w-20 h-28 rounded-lg bg-white border-2 border-gray-400 overflow-hidden shadow-md hover:shadow-xl hover:scale-105 transition-all duration-200 cursor-pointer">
        {!imageError ? (
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-lg">
            <Image
              src={cardImagePath}
              alt={`${card.rank} of ${card.suit === 'joker' ? 'Joker' : card.suit}`}
              width={80}
              height={112}
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
          <div className="absolute inset-0 flex flex-col items-center justify-center p-1">
            {isJoker ? (
              <div className="flex flex-col items-center justify-center w-full h-full">
                <div className="text-2xl mb-0.5">🃏</div>
                <div className="text-[8px] font-bold text-purple-700 tracking-wider">JOKER</div>
              </div>
            ) : (
              <>
                <div className={`text-[10px] font-bold ${suitColor}`}>{card.rank}</div>
                <div className={`text-xs ${suitColor}`}>{suitSymbol}</div>
              </>
            )}
          </div>
        )}
        
        {/* Slight dimming to indicate discarded */}
        <div className="absolute inset-0 bg-black/10 rounded-lg" />
      </div>

      {/* Card info overlay on hover */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
        {card.rank} of {card.suit === 'joker' ? 'Joker' : card.suit}
        {isTwoEyedJack && ' (Two-Eyed Jack)'}
        {isOneEyedJack && ' (One-Eyed Jack)'}
        {isJoker && card.wildCardType === 'joker' && ' (Joker)'}
        <br />
        <span className="text-gray-400">#{index + 1} {index === 0 ? '(Most recent)' : ''}</span>
      </div>

      {/* Position indicator (most recent gets special styling) */}
      {index === 0 && (
        <div className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md">
          ↑
        </div>
      )}
    </div>
  )
}

export default function DiscardPileView({ discardPile, isOpen, onClose }: DiscardPileViewProps) {
  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto border-2 border-gray-600 shadow-2xl animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            Discard Pile ({discardPile.length} {discardPile.length === 1 ? 'card' : 'cards'})
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold transition-colors hover:scale-110 transform duration-200"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Cards grid - most recent first */}
        {discardPile.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <p className="text-lg">The discard pile is empty.</p>
            <p className="text-sm mt-2">Played cards will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {discardPile.map((card, index) => (
              <DiscardCardItem key={`${card.id}-${index}`} card={card} index={index} />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-700 text-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

