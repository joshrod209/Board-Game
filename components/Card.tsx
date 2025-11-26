'use client'

import Image from 'next/image'
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
  const isCornerJoker = isJoker && cell.isCorner
  const suitColor = getSuitColor(cell.suit)
  const suitSymbol = getSuitSymbol(cell.suit)

  // Determine which corner joker image to use
  const getCornerJokerImage = () => {
    if (!isCornerJoker) return null
    
    // Top-left (0,0) and bottom-right (9,9) use colored joker
    if ((cell.row === 0 && cell.col === 0) || (cell.row === 9 && cell.col === 9)) {
      return '/cards/Joker Corner_png.png'
    }
    
    // Top-right (0,9) and bottom-left (9,0) use black/white joker
    if ((cell.row === 0 && cell.col === 9) || (cell.row === 9 && cell.col === 0)) {
      return '/cards/Joker Corner 2_png.png'
    }
    
    return null
  }

  const cornerJokerImage = getCornerJokerImage()

  return (
    <div
      className={`
        w-full h-full rounded-lg
        bg-white border-2 border-gray-400
        flex flex-col items-center justify-center
        relative overflow-hidden
        shadow-md
        pointer-events-none
        ${isJoker && !isCornerJoker ? 'bg-gradient-to-br from-purple-100 to-purple-200 border-purple-400' : ''}
        ${className}
      `}
    >
      {/* Corner joker images */}
      {isCornerJoker && cornerJokerImage ? (
        <Image
          src={cornerJokerImage}
          alt="Corner Joker"
          width={200}
          height={300}
          className="w-full h-full object-cover rounded-lg"
          unoptimized
        />
      ) : isJoker ? (
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
