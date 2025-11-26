'use client'

import type { Cell } from '@/gameCore/types'

type CardProps = {
  cell: Cell
  className?: string
}

const getSuitSymbol = (suit: Cell['suit']): string => {
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

const getSuitColor = (suit: Cell['suit']): string => {
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

export default function Card({ cell, className = '' }: CardProps) {
  const isJoker = cell.suit === 'joker' || cell.rank === 'Joker'
  const suitColor = getSuitColor(cell.suit)
  const suitSymbol = getSuitSymbol(cell.suit)

  return (
    <div
      className={`
        w-full h-full rounded-lg
        bg-white border-2 border-gray-400
        flex flex-col items-center justify-center
        relative overflow-hidden
        shadow-md
        pointer-events-none
        ${isJoker ? 'bg-gradient-to-br from-purple-100 to-purple-200 border-purple-400' : ''}
        ${className}
      `}
    >
      {/* Joker special styling */}
      {isJoker ? (
        <div className="flex flex-col items-center justify-center w-full h-full p-2">
          <div className="text-3xl mb-1">🃏</div>
          <div className="text-[10px] font-bold text-purple-700 tracking-wider">JOKER</div>
        </div>
      ) : (
        <>
          {/* Top-left rank and suit */}
          <div className={`absolute top-1 left-1.5 flex flex-col items-start ${suitColor} font-bold z-10`}>
            <div className="text-[11px] leading-tight font-serif">{cell.rank}</div>
            <div className="text-[10px] leading-tight mt-0.5">{suitSymbol}</div>
          </div>

          {/* Center large suit symbol */}
          <div className={`text-xl md:text-2xl ${suitColor} font-bold`}>
            {suitSymbol}
          </div>

          {/* Bottom-right rank and suit (upside down) */}
          <div className={`absolute bottom-1 right-1.5 flex flex-col items-end rotate-180 ${suitColor} font-bold z-10`}>
            <div className="text-[11px] leading-tight font-serif">{cell.rank}</div>
            <div className="text-[10px] leading-tight mt-0.5">{suitSymbol}</div>
          </div>
        </>
      )}
    </div>
  )
}
