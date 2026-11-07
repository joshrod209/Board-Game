'use client'

import { memo } from 'react'
import type { Cell, ChipColor } from '@/gameCore/types'
import CardComponent from './Card'

type BoardCellProps = {
  row: number
  col: number
  cell: Cell
  /** Color of the permanent capper on this cell, if any */
  capperColor: ChipColor | null
  /** Color of the temporary capper while selecting a score, if any */
  tempCapColor: ChipColor | null
  onCellClick: (row: number, col: number) => void
}

const RING_CLASSES: Record<ChipColor, string> = {
  red: 'ring-2 ring-red-500 bg-red-500/10',
  blue: 'ring-2 ring-blue-500 bg-blue-500/10',
  green: 'ring-2 ring-green-500 bg-green-500/10',
  yellow: 'ring-2 ring-yellow-500 bg-yellow-500/10',
}

const CHIP_CLASSES: Record<ChipColor, string> = {
  red: 'bg-red-600',
  blue: 'bg-blue-600',
  green: 'bg-green-600',
  yellow: 'bg-yellow-600',
}

const capperStyle = { imageRendering: 'crisp-edges', backfaceVisibility: 'hidden' } as const

function CapperChip({ color }: { color: ChipColor }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
      <div className="relative w-12 h-12 rounded-full bg-white border-2 border-gray-400 shadow-xl" style={capperStyle}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`w-6 h-6 rounded-full ${color === 'red' ? 'bg-red-600' : 'bg-blue-600'}`} />
        </div>
      </div>
    </div>
  )
}

/**
 * One square of the board. Memoized so a click only redraws the squares
 * whose card, chip or capper actually changed.
 */
function BoardCell({ row, col, cell, capperColor, tempCapColor, onCellClick }: BoardCellProps) {
  return (
    <button
      onClick={() => onCellClick(row, col)}
      className={`rounded-md transition-all relative hover:scale-[1.02] ${capperColor ? RING_CLASSES[capperColor] : ''}`}
      aria-label={`Cell ${row}, ${col}`}
      type="button"
    >
      <CardComponent cell={cell} />

      {/* Chip overlay - just the colored sphere */}
      {cell.chip && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className={`w-10 h-10 rounded-full border-2 border-white shadow-lg ${CHIP_CLASSES[cell.chip]}`} />
        </div>
      )}

      {/* Permanent capper from a capped score (always visible, unremovable) */}
      {capperColor && <CapperChip color={capperColor} />}

      {/* Temporary capper during selection (not on permanent cappers or jokers) */}
      {tempCapColor && !capperColor && !cell.isCorner && <CapperChip color={tempCapColor} />}
    </button>
  )
}

export default memo(BoardCell)
