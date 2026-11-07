'use client'

import type { Card } from '@/gameCore/types'
import HandCard from './HandCard'

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
  canBurn?: boolean // Whether the selected card can be burned (unplayable)
  hasBurned?: boolean // Whether player has already burned this turn
  selectedCard?: Card | null // The actual selected card object (to check wild card type)
  jokerActionMode?: 'add' | 'remove' | null // Current joker action mode
  canPass?: boolean // No regular card can be played, so the player may pass
  onPass?: () => void
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
}: HandProps) {
  if (!hand || hand.cards.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="text-white text-sm text-center">
          No cards in hand
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="mb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className={`text-sm font-bold ${playerColor === 'red' ? 'text-red-400' : 'text-blue-400'}`}>
            {title ?? `${playerColor.toUpperCase()} Player's Hand`} ({hand.cards.length} cards)
          </h3>
          <div className="flex gap-2">
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
            {/* Burn button */}
            {selectedCardId && onBurnCard && canBurn && !hasBurned && !disabled && (
              <button
                onClick={onBurnCard}
                className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded transition-colors"
                title="Burn this unplayable card and draw a new one"
              >
                🔥 Burn Card
              </button>
            )}
          </div>
        </div>
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
              <p className="text-xs text-gray-400 mt-1">
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
        {selectedCardId && canBurn && !hasBurned && (
          <p className="text-xs text-orange-400 mt-1">
            ⚠️ This card is unplayable - you can burn it to draw a new card
          </p>
        )}
        {canPass && onPass && !disabled && (
          <p className="text-xs text-gray-300 mt-1">
            No regular card fits on the board. {hasBurned ? '' : 'You can burn a dead card (select it first), '}
            {hand.cards.some(c => c.wildCardType) ? 'use a wild card, or pass.' : 'or pass.'}
          </p>
        )}
        {hasBurned && (
          <p className="text-xs text-gray-500 mt-1 italic">
            You have already burned a card this turn
          </p>
        )}
        {!selectedCardId && !disabled && (
          <p className="text-xs text-gray-400 mt-1">
            Select a card from your hand to play
          </p>
        )}
        {disabled && (
          <p className="text-xs text-gray-500 mt-1 italic">
            Card selection disabled
          </p>
        )}
      </div>
      <div className="flex gap-2 justify-center flex-wrap">
        {hand.cards.map(card => (
          <HandCard
            key={card.id}
            card={card}
            isSelected={selectedCardId === card.id}
            onSelect={onCardSelect}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  )
}

