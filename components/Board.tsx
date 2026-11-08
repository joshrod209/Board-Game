'use client'

import { useState, useEffect, useMemo, useCallback, useLayoutEffect, useRef } from 'react'
import type { Cell, ChipColor, Score, Deck, Hand, Card } from '@/gameCore/types'
import { BOARD_SIZE, INITIAL_HAND_SIZE } from '@/gameCore/constants'
import { boardLayout } from '@/gameCore/boardLayout'
import { detectScores, capScore, checkWinCondition, validateCappedChipsInScore, validateConsecutiveLine } from '@/gameCore/scoreDetection'
import { initializeDeck } from '@/gameCore/deck'
import { createHand } from '@/gameCore/hand'
import { canPlayCard, playCard as validatePlayCard } from '@/gameCore/playCard'
import { isPlayableFor, canPassWith, cardLabel, type Team } from '@/gameCore/engine'
import { wildCardAddChip, wildCardRemoveChip } from '@/gameCore/jokerLogic'
import { debugLog } from '@/gameCore/debug'
import BoardCell from './BoardCell'
import HandComponent from './Hand'
import PileStrip from './PileStrip'
import DiscardPileView from './DiscardPileView'
import Scoreboard from './Scoreboard'

export default function Board() {
  // Track current player (red starts)
  const [currentPlayer, setCurrentPlayer] = useState<ChipColor>('red')
  // Track starting player for alternating games
  const [startingPlayer, setStartingPlayer] = useState<ChipColor>('red')
  
  // Initialize board state from boardLayout data structure
  // Creates a deep copy to avoid mutating the original boardLayout
  const [board, setBoard] = useState<Cell[][]>(() =>
    boardLayout.map(row =>
      row.map(cell => ({
        id: cell.id,
        row: cell.row,
        col: cell.col,
        rank: cell.rank,
        suit: cell.suit,
        isCorner: cell.isCorner,
        isRoyalBelt: cell.isRoyalBelt,
        chip: null, // No chips placed initially
        isCapped: cell.isCapped ?? false,
        scoreIds: cell.scoreIds || [], // Track which scores this cell belongs to
      }))
    )
  )
  
  // Track capped scores and cap mode
  const [cappedScores, setCappedScores] = useState<Score[]>([])
  const [capMode, setCapMode] = useState<ChipColor | null>(null) // Which team is capping (set by the first chip tapped)
  const [capArmed, setCapArmed] = useState(false) // "Cap a score" pressed; waiting for the first chip to pick the team
  const [selectedCapCells, setSelectedCapCells] = useState<Array<{ row: number; col: number }>>([]) // Cells selected for capping
  
  // Track winner state
  const [winner, setWinner] = useState<ChipColor | null>(null)
  const [showWinnerModal, setShowWinnerModal] = useState(false)
  
  // Deck and hand state
  const [deck, setDeck] = useState<Deck | null>(null)
  const [redHand, setRedHand] = useState<Hand | null>(null)
  const [blueHand, setBlueHand] = useState<Hand | null>(null)
  const [selectedCard, setSelectedCard] = useState<Card | null>(null) // Currently selected card for playing
  const [hasBurnedThisTurn, setHasBurnedThisTurn] = useState(false) // Track if current player has burned this turn
  const [jokerActionMode, setJokerActionMode] = useState<'add' | 'remove' | null>(null) // For joker cards: which action to take
  const [discardPile, setDiscardPile] = useState<Card[]>([]) // Discarded cards (most recent first)
  const [showDiscardPileView, setShowDiscardPileView] = useState(false) // Modal state for viewing full discard pile
  const [lastMove, setLastMove] = useState<{ row: number; col: number } | null>(null) // Square of the latest play (pulses)
  const [lastEvent, setLastEvent] = useState<string | null>(null) // e.g. "Red played 9♦"
  const [toast, setToast] = useState<string | null>(null) // Short message when a move isn't allowed
  
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])
  
  // Get all cells that have permanent capper chips (from capped scores)
  // Jokers are excluded - they're free squares and can't have cappers
  const permanentCappers = useMemo((): Map<string, ChipColor> => {
    const permanentCappers = new Map<string, ChipColor>()
    cappedScores.forEach(score => {
      if (score.isCapped) {
        score.cells.forEach(cell => {
          // Check if this cell is a joker - jokers can't have cappers
          const boardCell = board[cell.row]?.[cell.col]
          if (boardCell && !boardCell.isCorner) {
            permanentCappers.set(`${cell.row},${cell.col}`, score.color)
          }
        })
      }
    })
    return permanentCappers
  }, [cappedScores, board])
  
  /**
   * Get the current player's hand
   */
  const getCurrentPlayerHand = (): Hand | null => {
    if (currentPlayer === 'red') {
      return redHand
    }
    return blueHand
  }
  
  /**
   * Handle card selection from hand
   */
  const handleCardSelect = (card: Card) => {
    // Only allow selecting cards if it's the current player's turn and not in cap mode
    if (capMode || capArmed) {
      debugLog('Cannot select cards while in cap mode')
      return
    }
    
    // Toggle selection - if same card, deselect it
    if (selectedCard?.id === card.id) {
      setSelectedCard(null)
      setJokerActionMode(null) // Clear joker action mode when deselecting
      debugLog('Card deselected')
    } else {
      setSelectedCard(card)
      // Reset joker action mode when selecting a new card
      setJokerActionMode(null) // Will need to be set before playing joker
      
      // Log wild card type
      if (card.wildCardType === 'twoEyedJack') {
        debugLog(`Card selected: ${card.rank} of ${card.suit} (Two-Eyed Jack - can place chip anywhere)`)
      } else if (card.wildCardType === 'oneEyedJack') {
        debugLog(`Card selected: ${card.rank} of ${card.suit} (One-Eyed Jack - can remove opponent chip)`)
      } else if (card.wildCardType === 'joker') {
        debugLog(`Card selected: ${card.rank} of ${card.suit} (Joker - choose add or remove action)`)
      } else {
        debugLog(`Card selected: ${card.rank} of ${card.suit}`)
      }
    }
  }
  
  /**
   * Handle burning a card (discard unplayable card and draw new one)
   */
  const handleBurnCard = () => {
    if (!selectedCard) {
      debugLog('No card selected to burn')
      setToast('Select the card you want to burn first')
      return
    }
    
    if (!deck || !board) {
      debugLog('Game not initialized')
      return
    }
    
    if (hasBurnedThisTurn) {
      debugLog('You have already burned a card this turn. Only one burn per turn allowed.')
      setToast('You can only burn one card per turn')
      return
    }
    
    if (capMode || capArmed) {
      debugLog('Cannot burn cards while in cap mode')
      return
    }
    
    // Get current player's hand
    const currentHand = getCurrentPlayerHand()
    if (!currentHand || !currentHand.hasCard(selectedCard.id)) {
      debugLog('Selected card is not in your hand')
      return
    }
    
    // Validate card is unplayable (for this player: a one-eyed jack only
    // counts as playable when there's an opponent chip it could remove)
    if (isPlayableFor(selectedCard, board, currentPlayer as Team)) {
      debugLog('Card is playable. Cannot burn playable cards. Play the card instead.')
      setToast(`${cardLabel(selectedCard)} can still be played, so it can't be burned`)
      return
    }
    
    // Execute burn: remove card and draw new one
    const newCard = deck.draw()
    if (!newCard) {
      debugLog('Deck is empty - cannot burn')
      setToast('The deck is empty, so there is nothing to draw')
      return
    }
    const burnResult = { newCard }
    
    // Remove burned card from hand
    const removedCard = currentHand.removeCard(selectedCard.id)
    if (!removedCard) {
      console.error('Failed to remove burned card from hand')
      return
    }
    
    // Add burned card to discard pile (prepend to keep most recent first)
    setDiscardPile(prev => [removedCard, ...prev])
    setLastEvent(`${currentPlayer === 'red' ? 'Red' : 'Blue'} burned ${cardLabel(removedCard)}`)
    
    // Add new card to hand
    if (burnResult.newCard) {
      currentHand.addCard(burnResult.newCard)
    }
    
    // Update hand state to trigger re-render
    const updatedHand = createHand()
    updatedHand.cards = [...currentHand.cards]
    if (currentPlayer === 'red') {
      setRedHand(updatedHand)
    } else {
      setBlueHand(updatedHand)
    }
    
    // Clear selected card and mark as burned this turn
    setSelectedCard(null)
    setHasBurnedThisTurn(true)
    setJokerActionMode(null)
    
    debugLog(`🔥 Burned card: ${removedCard.rank}${removedCard.suit === 'joker' ? '🃏' : removedCard.suit[0]}`)
    if (burnResult.newCard) {
      debugLog(`   Drew new card: ${burnResult.newCard.rank}${burnResult.newCard.suit === 'joker' ? '🃏' : burnResult.newCard.suit[0]}`)
    }
    debugLog(`   Hand now has ${updatedHand.cards.length} cards`)
  }
  
  /**
   * Draw a new card for a specific player after playing a card
   * @param playerColor - The player to draw a card for
   * @param currentHand - Optional: the current hand to add the card to (to avoid stale state)
   */
  const drawCardForPlayer = (playerColor: ChipColor, currentHand?: Hand | null) => {
    if (!deck) return
    
    const newCard = deck.draw()
    if (!newCard) {
      debugLog('Deck is empty - no more cards to draw')
      return
    }
    
    // Use provided hand or get from state
    const hand = currentHand ?? (playerColor === 'red' ? redHand : blueHand)
    if (hand) {
      // Add card to hand
      hand.addCard(newCard)
      // Update state to trigger re-render - create new hand with new cards array reference
      const updatedHand = createHand()
      updatedHand.cards = [...hand.cards] // Copy cards array (includes the new card)
      if (playerColor === 'red') {
        setRedHand(updatedHand)
      } else {
        setBlueHand(updatedHand)
      }
      debugLog(`Drew new card for ${playerColor}:`, `${newCard.rank}${newCard.suit === 'joker' ? '🃏' : newCard.suit[0]}`)
      debugLog(`  ${playerColor} hand now has ${updatedHand.cards.length} cards`)
    }
  }
  
  /**
   * Shuffle and deal: create fresh deck, shuffle, and deal cards to players
   * This will replace the current deck and deal fresh hands
   */
  const shuffleAndDeal = () => {
    // Create new full deck
    const newDeck = initializeDeck()
    
    // Shuffle the deck
    newDeck.shuffle()
    
    // Create new hands for both players
    const newRedHand = createHand()
    const newBlueHand = createHand()
    
    // Deal INITIAL_HAND_SIZE cards to each player
    for (let i = 0; i < INITIAL_HAND_SIZE; i++) {
      const redCard = newDeck.draw()
      const blueCard = newDeck.draw()
      
      if (redCard) {
        newRedHand.addCard(redCard)
      }
      if (blueCard) {
        newBlueHand.addCard(blueCard)
      }
    }
    
    // Update state
    setDeck(newDeck)
    setRedHand(newRedHand)
    setBlueHand(newBlueHand)
    setSelectedCard(null) // Clear any selected card
    setDiscardPile([]) // Clear discard pile (fresh start)
    
    debugLog('Shuffled and dealt:')
    debugLog(`  Red hand: ${newRedHand.cards.length} cards`)
    debugLog(`  Blue hand: ${newBlueHand.cards.length} cards`)
    debugLog(`  Deck remaining: ${newDeck.cards.length} cards`)
  }
  
  /**
   * Initialize game: create deck, shuffle, and deal initial hands
   */
  const initializeGame = () => {
    // Create and shuffle deck
    const newDeck = initializeDeck()
    newDeck.shuffle()
    
    // Create hands for both players
    const newRedHand = createHand()
    const newBlueHand = createHand()
    
    // Deal initial cards to each player
    for (let i = 0; i < INITIAL_HAND_SIZE; i++) {
      const redCard = newDeck.draw()
      const blueCard = newDeck.draw()
      
      if (redCard) {
        newRedHand.addCard(redCard)
      }
      if (blueCard) {
        newBlueHand.addCard(blueCard)
      }
    }
    
    // Update state
    setDeck(newDeck)
    setRedHand(newRedHand)
    setBlueHand(newBlueHand)
    setSelectedCard(null) // Clear any selected card
    setHasBurnedThisTurn(false) // Reset burn status
    setJokerActionMode(null) // Reset joker action mode
    setDiscardPile([]) // Reset discard pile
    
    // Debug: log hands for verification
    debugLog('Game initialized:')
    debugLog(`  Red hand: ${newRedHand.cards.length} cards`, newRedHand.cards.map(c => `${c.rank}${c.suit === 'joker' ? '🃏' : c.suit[0]}`))
    debugLog(`  Blue hand: ${newBlueHand.cards.length} cards`, newBlueHand.cards.map(c => `${c.rank}${c.suit === 'joker' ? '🃏' : c.suit[0]}`))
    debugLog(`  Deck remaining: ${newDeck.cards.length} cards`)
  }
  
  // Initialize game on component mount
  useEffect(() => {
    initializeGame()
  }, []) // Empty dependency array - only run on mount
  
  const handleCellClick = (row: number, col: number) => {
    // Capping, step 1: the first chip tapped decides which team is capping
    if (capArmed && !capMode) {
      const cell = board[row][col]
      if (cell.isCorner || !cell.chip) {
        setToast('Start with a chip in the line you want to cap')
        return
      }
      setCapMode(cell.chip)
      setSelectedCapCells([{ row, col }])
      return
    }
    
    // If in cap mode, add this cell to selection
    if (capMode) {
      const cell = board[row][col]
      
      // Jokers can be selected as part of a score line (count as 5th position)
      // But they won't get chips or cappers placed on them
      if (cell.isCorner) {
        // Jokers are free squares - allow selection but they won't get cappers
        debugLog('Joker selected for score line:', row, col)
        // Continue to selection logic below
      } else {
        // For non-joker cells, check if they're capped or have chips
        // Allow selection of capped cells of the same color (for additional scores)
        // Only block capped cells of different colors
        if (permanentCappers.has(`${row},${col}`)) {
          const cappedColor = permanentCappers.get(`${row},${col}`)
          if (cappedColor !== capMode) {
            setToast("You can't use the other team's capped chips")
            return // Can't select capped cells of different colors
          }
          // Same color capped cells can be selected if they create a valid score
          debugLog('Capped cell selected for additional score:', row, col, 'color:', capMode)
        }
        
        // Must have a chip of the cap mode color
        // Note: cells with chips of OTHER colors can't be selected (they belong to other players)
        // Capped cells of the same color are already handled above
        const hasValidChip = (cell.chip === capMode)
        
        if (!hasValidChip) {
          debugLog('Cell rejected for cap mode:', row, col, 'chip:', cell.chip, 'capMode:', capMode)
          setToast(`Pick squares with ${capMode} chips`)
          return // Can't cap cells without matching chip
        }
      }
      
      debugLog('Cell accepted for cap mode:', row, col, 'chip:', cell.chip, 'capMode:', capMode, 'isCapped:', cell.isCapped)
      
      // Check if cell already selected
      const isAlreadySelected = selectedCapCells.some(
        c => c.row === row && c.col === col
      )
      
      if (isAlreadySelected) {
        // Remove from selection if already selected
        setSelectedCapCells(prev => prev.filter(
          c => !(c.row === row && c.col === col)
        ))
      } else {
        // Before adding, check if this would result in more than 2 capped chips
        // Count how many capped chips are already selected
        const currentlySelectedCappedCount = selectedCapCells.filter(({ row: r, col: c }) => {
          const cell = board[r][c]
          return cell?.isCapped && cell?.chip === capMode
        }).length
        
        // If this new cell is capped, check rules
        if (cell.isCapped && cell.chip === capMode) {
          if (currentlySelectedCappedCount >= 2) {
            debugLog('Cannot select more than 2 capped chips per score. Already have', currentlySelectedCappedCount, 'capped chips selected.')
            setToast('A score can reuse at most 2 capped chips')
            return // Block selection - max 2 capped chips allowed
          }
          
          // If this is the second capped chip, verify it comes from a different score
          if (currentlySelectedCappedCount === 1) {
            // Find the first capped chip's scores
            const firstCappedCell = selectedCapCells.find(({ row: r, col: c }) => {
              const cell = board[r][c]
              return cell?.isCapped && cell?.chip === capMode
            })
            
            if (firstCappedCell) {
              const firstCappedScores = cappedScores.filter(score => 
                score.color === capMode && 
                score.isCapped &&
                score.cells.some(c => c.row === firstCappedCell.row && c.col === firstCappedCell.col)
              )
              
              const secondCappedScores = cappedScores.filter(score => 
                score.color === capMode && 
                score.isCapped &&
                score.cells.some(c => c.row === row && c.col === col)
              )
              
              // Check if they share any scores
              const firstScoreIds = new Set(firstCappedScores.map(s => s.id))
              const secondScoreIds = new Set(secondCappedScores.map(s => s.id))
              const sharedScores = Array.from(firstScoreIds).filter(id => secondScoreIds.has(id))
              
              if (sharedScores.length > 0) {
                debugLog('Cannot select two capped chips from the same score. They must come from different scores.')
                debugLog('  First capped cell scores:', Array.from(firstScoreIds))
                debugLog('  Second capped cell scores:', Array.from(secondScoreIds))
                debugLog('  Shared scores:', sharedScores)
                setToast('The 2 capped chips must come from different scores')
                return // Block - must be from different scores
              }
              
              debugLog('Second capped chip is from a different score - allowed')
            }
          }
        }
        
        // Add to selection
        const newSelection = [...selectedCapCells, { row, col }]
        setSelectedCapCells(newSelection)
        
        // If we have 5 cells, check if they form a valid score
        if (newSelection.length === 5) {
          // First, validate that the 5 selected cells form a consecutive line
          const validatedScore = validateConsecutiveLine(newSelection, board, capMode)
          
          if (!validatedScore) {
            debugLog('Selected cells do not form a valid consecutive line')
            setToast("Those 5 squares aren't a line you can cap")
            return // Invalid selection - not a consecutive line
          }
          
          debugLog('Valid consecutive line detected:', validatedScore.direction)
          
          // Now check for all possible scores that these cells could form
          // (for double/triple/quad detection)
          // This will find ALL scores including those using capped chips of the same color
          // Pass cappedScores to validate capped chip rules (max 1 capped chip)
          const allScores = detectScores(board, capMode, cappedScores)
          
          debugLog('All scores detected for', capMode, ':', allScores.length, 'scores')
          allScores.forEach(score => {
            debugLog('  Score:', score.direction, 'cells:', score.cells.map(c => `${c.row},${c.col}`).join(','))
          })
          
          // Find all scores that match the selected cells exactly (same cells, any direction)
          const matchingScores = allScores.filter(score => {
            // Check if all 5 selected cells match this score
            const scoreCellIds = score.cells.map(c => `${c.row},${c.col}`).sort()
            const selectedCellIds = newSelection.map(c => `${c.row},${c.col}`).sort()
            
            // Check if arrays match (same cells)
            if (scoreCellIds.length !== selectedCellIds.length) return false
            for (let i = 0; i < scoreCellIds.length; i++) {
              if (scoreCellIds[i] !== selectedCellIds[i]) return false
            }
            
            // Check if this exact score (same cells + direction) is already capped
            const isAlreadyCapped = cappedScores.some(capped => {
              if (capped.id === score.id) return true
              if (capped.color !== score.color || capped.direction !== score.direction) return false
              if (!capped.isCapped) return false
              const cappedCellIds = capped.cells.map(c => `${c.row},${c.col}`).sort()
              const scoreCellIds = score.cells.map(c => `${c.row},${c.col}`).sort()
              return cappedCellIds.length === scoreCellIds.length && 
                     cappedCellIds.every((id, i) => id === scoreCellIds[i])
            })
            
            if (isAlreadyCapped) {
              debugLog('Score already capped:', score.direction)
              return false
            }
            
            // For double/triple/quad: if all cells are capped from the same selection,
            // allow it (they're sharing cells from the same score set)
            const allCellsCapped = score.cells.every(({ row, col }) => {
              const cell = board[row][col]
              return cell?.isCapped === true
            })
            
            // If all cells are capped, check if they're from scores of the same color
            // (meaning they're part of a double/triple/quad from the same selection)
            if (allCellsCapped) {
              const cellScoreIds = new Set<string>()
              score.cells.forEach(({ row, col }) => {
                const cell = board[row][col]
                cell?.scoreIds.forEach(id => cellScoreIds.add(id))
              })
              
              // Check if all capped cells belong to scores of the same color
              const relatedScores = cappedScores.filter(s => 
                cellScoreIds.has(s.id) && s.color === capMode
              )
              
              debugLog('All cells capped, related scores:', relatedScores.length, 'for', score.direction)
              
              // If all cells are capped from scores of the same color, allow it
              // (this is a double/triple/quad scenario - shared cells can be reused)
              return relatedScores.length > 0
            }
            
            // Otherwise, use normal validation (max 2 capped chips from different scores)
            const isValid = validateCappedChipsInScore(score, board, cappedScores)
            debugLog('Score validation for', score.direction, ':', isValid)
            return isValid
          })
          
          // Always include the validated score if it's not already in matchingScores
          const validatedScoreInList = matchingScores.some(s => 
            s.direction === validatedScore.direction &&
            s.cells.every((c, i) => c.row === validatedScore.cells[i].row && c.col === validatedScore.cells[i].col)
          )
          
          if (!validatedScoreInList) {
            matchingScores.push(validatedScore)
          }
          
          // Score counting logic:
          // - 1 matching score = counts as 1 score (single)
          // - 2 matching scores = counts as 2 scores (double - same cells form 2 different lines)
          // - 3 matching scores = counts as 3 scores (triple - same cells form 3 different lines)
          // - 4 matching scores = counts as 4 scores (quad - same cells form 4 different lines)
          // Each capped score counts toward the win condition (need 4 total)
          
          debugLog('Matching scores found:', matchingScores.length, matchingScores.map(s => s.direction))
          
          if (matchingScores.length > 0) {
            // Remove any scores that are already capped to avoid duplicates
            const scoresToCap = matchingScores.filter(score => {
              // Check if this exact score (same cells, same direction) is already capped
              return !cappedScores.some(capped => 
                capped.id === score.id || 
                (capped.color === score.color &&
                 capped.direction === score.direction &&
                 capped.cells.length === score.cells.length &&
                 capped.cells.every((c, i) => 
                   c.row === score.cells[i].row && c.col === score.cells[i].col
                 ))
              )
            })
            
            // Cap all matching scores that aren't already capped
            // Use a batch update to ensure all scores are added correctly
            if (scoresToCap.length > 0) {
              setBoard(prevBoard => {
                const newBoard = prevBoard.map(r => [...r])
                
                // Cap all scores in the board
                scoresToCap.forEach(score => {
                  const scoreToCap = { ...score, isCapped: true }
                  capScore(newBoard, scoreToCap)
                })
                
                // Add all scores to capped scores in one update
                setCappedScores(current => {
                  const newScores = scoresToCap
                    .map(score => ({ ...score, isCapped: true }))
                    .filter(scoreToAdd => {
                      // Check if this exact score already exists
                      // For double/triple/quad: same cells but DIFFERENT directions = different scores
                      return !current.some(capped => {
                        // Same ID = same score
                        if (capped.id === scoreToAdd.id) return true
                        
                        // Must be same color AND same direction AND same cells to be duplicate
                        if (capped.color !== scoreToAdd.color) return false
                        if (capped.direction !== scoreToAdd.direction) return false // Different direction = different score!
                        if (!capped.isCapped || capped.cells.length !== scoreToAdd.cells.length) return false
                        
                        // Check if cells match (sort to compare regardless of order)
                        const cappedCellIds = capped.cells.map(c => `${c.row},${c.col}`).sort()
                        const scoreCellIds = scoreToAdd.cells.map(c => `${c.row},${c.col}`).sort()
                        return cappedCellIds.every((id, i) => id === scoreCellIds[i])
                      })
                    })
                  
                  debugLog('Capping scores:', newScores.length, 'new scores:', newScores.map(s => `${s.direction}-${s.cells.map(c => `${c.row},${c.col}`).join(',')}`))
                  
                  const updated = [...current, ...newScores]
                  
                  debugLog('Total capped scores:', updated.length, 'for', capMode, ':', updated.filter(s => s.color === capMode && s.isCapped).length)
                  
                  // Check for win condition
                  const detectedWinner = checkWinCondition(updated)
                  if (detectedWinner && !winner) {
                    // Only show winner modal once
                    setWinner(detectedWinner)
                    setShowWinnerModal(true)
                  }
                  
                  return updated
                })
                
                return newBoard
              })
              
              // After capping, check if there are more valid scores available for this color
              // This allows players to cap double/triple/quad scores in sequence
              setCappedScores(currentCappedScores => {
                const updatedCappedScores = [...currentCappedScores, ...scoresToCap.map(s => ({ ...s, isCapped: true }))]
                
                // Check for additional valid scores after state updates
                setTimeout(() => {
                  setBoard(currentBoard => {
                    const allAvailableScores = detectScores(currentBoard, capMode, updatedCappedScores)
                    
                    // Filter out scores that are already capped
                    const uncappedScores = allAvailableScores.filter(score => {
                      return !updatedCappedScores.some(capped => 
                        capped.id === score.id || 
                        (capped.color === score.color &&
                         capped.direction === score.direction &&
                         capped.cells.length === score.cells.length &&
                         capped.cells.every((c, i) => 
                           c.row === score.cells[i].row && c.col === score.cells[i].col
                         ))
                      )
                    })
                    
                    // Validate remaining scores
                    const validUncappedScores = uncappedScores.filter(score => 
                      validateCappedChipsInScore(score, currentBoard, updatedCappedScores)
                    )
                    
                    debugLog('Remaining valid scores after capping:', validUncappedScores.length)
                    
                    // If there are more valid scores, keep cap mode active
                    // Otherwise, exit cap mode (but DON'T switch turns - player can continue their turn)
                    // This allows players to cap missed scores from previous turns without losing their current turn
                    if (validUncappedScores.length === 0) {
                      setCapMode(null)
                      setCapArmed(false)
                      debugLog('Exiting cap mode - player can continue their turn to place a chip')
                    } else {
                      // Keep cap mode active so player can cap additional scores
                      debugLog('Keeping cap mode active for additional scores:', validUncappedScores.length)
                    }
                    
                    return currentBoard
                  })
                }, 100) // Small delay to ensure state is updated
                
                return updatedCappedScores
              })
              
              // Clear selection but keep cap mode if there are more scores
              setSelectedCapCells([])
              setLastEvent(`${capMode === 'red' ? 'Red' : 'Blue'} capped ${scoresToCap.length === 1 ? 'a score' : `${scoresToCap.length} scores`}`)
            } else {
              setToast('That line is already capped')
            }
          } else {
            setToast("Those 5 squares aren't a score you can cap")
          }
        }
      }
      return
    }
    
    // Normal chip placement - requires card selection and validation
    const cell = board[row][col]
    
    // Require a selected card before placing chip
    if (!selectedCard) {
      const currentHand = getCurrentPlayerHand()
      const handCards = currentHand?.cards || []
      debugLog(`⚠️ No card selected. ${currentPlayer.toUpperCase()} player's hand:`, handCards.map(c => `${c.rank}${c.suit === 'joker' ? '🃏' : c.suit[0]}`))
      debugLog(`   To select a card (temporary for Phase 3): setSelectedCard(handCards[0]) in console`)
      debugLog(`   Card selection UI coming in Phase 4`)
      setToast('Pick a card from your hand first')
      return
    }
    
    // Get current player's hand
    const currentHand = getCurrentPlayerHand()
    if (!currentHand || !currentHand.hasCard(selectedCard.id)) {
      debugLog('Selected card is not in your hand.')
      setSelectedCard(null) // Clear invalid selection
      return
    }
    
    // Handle wild cards (two-eyed jack, one-eyed jack, joker)
    if (selectedCard.wildCardType === 'twoEyedJack') {
      // Two-eyed jack: place chip anywhere (unoccupied)
      const addResult = wildCardAddChip(row, col, currentPlayer, board)
      if (!addResult.success) {
        debugLog(`❌ Cannot place chip with two-eyed jack: ${addResult.error}`)
        setToast(addResult.error ?? 'You cannot place a chip there')
        return
      }
      
      // Remove card from hand
      const removedCard = currentHand.removeCard(selectedCard.id)
      if (!removedCard) {
        console.error('Failed to remove card from hand')
        return
      }
      
      // Add card to discard pile (prepend to keep most recent first)
      setDiscardPile(prev => [removedCard, ...prev])
      setLastMove({ row, col })
      setLastEvent(`${currentPlayer === 'red' ? 'Red' : 'Blue'} played ${cardLabel(removedCard)}`)
      
      // Update hand state
      const updatedHand = createHand()
      updatedHand.cards = [...currentHand.cards]
      if (currentPlayer === 'red') {
        setRedHand(updatedHand)
      } else {
        setBlueHand(updatedHand)
      }
      
      // Place chip
      setBoard(prevBoard => {
        const newBoard = prevBoard.map((r, rIdx) => 
          r.map((c, cIdx) => {
            if (rIdx === row && cIdx === col) {
              return {
                ...c,
                chip: currentPlayer,
                scoreIds: c.scoreIds || []
              }
            }
            return c
          })
        )
        return newBoard
      })
      
      debugLog(`🎴 Two-eyed jack played: Placed ${currentPlayer} chip at (${row}, ${col})`)
      setSelectedCard(null)
      setJokerActionMode(null)
      
      // Draw new card and END TURN (two-eyed jack ends turn)
      drawCardForPlayer(currentPlayer, updatedHand)
      setCurrentPlayer(currentPlayer === 'red' ? 'blue' : 'red')
      setHasBurnedThisTurn(false)
      return
    }
    
    if (selectedCard.wildCardType === 'oneEyedJack') {
      // One-eyed jack: remove opponent's uncapped chip
      const opponentColor: ChipColor = currentPlayer === 'red' ? 'blue' : 'red'
      const removeResult = wildCardRemoveChip(row, col, opponentColor, board)
      if (!removeResult.success) {
        debugLog(`❌ Cannot remove chip with one-eyed jack: ${removeResult.error}`)
        setToast(removeResult.error ?? 'You cannot remove that chip')
        return
      }
      
      // Remove card from hand
      const removedCard = currentHand.removeCard(selectedCard.id)
      if (!removedCard) {
        console.error('Failed to remove card from hand')
        return
      }
      
      // Add card to discard pile (prepend to keep most recent first)
      setDiscardPile(prev => [removedCard, ...prev])
      setLastMove({ row, col })
      setLastEvent(`${currentPlayer === 'red' ? 'Red' : 'Blue'} removed a ${opponentColor} chip with ${cardLabel(removedCard)}`)
      
      // Update hand state
      const updatedHand = createHand()
      updatedHand.cards = [...currentHand.cards]
      if (currentPlayer === 'red') {
        setRedHand(updatedHand)
      } else {
        setBlueHand(updatedHand)
      }
      
      // Remove chip from board
      setBoard(prevBoard => {
        const newBoard = prevBoard.map((r, rIdx) => 
          r.map((c, cIdx) => {
            if (rIdx === row && cIdx === col) {
              return {
                ...c,
                chip: null,
                scoreIds: []
              }
            }
            return c
          })
        )
        return newBoard
      })
      
      debugLog(`🎴 One-eyed jack played: Removed ${opponentColor} chip from (${row}, ${col})`)
      setSelectedCard(null)
      setJokerActionMode(null)
      
      // Draw new card and END TURN (one-eyed jack ends turn)
      drawCardForPlayer(currentPlayer, updatedHand)
      const nextPlayer: ChipColor = currentPlayer === 'red' ? 'blue' : 'red'
      setCurrentPlayer(nextPlayer)
      setHasBurnedThisTurn(false)
      setJokerActionMode(null)
      return
    }
    
    if (selectedCard.wildCardType === 'joker') {
      // Joker: player must choose add or remove action
      if (!jokerActionMode) {
        // First click: show UI to choose action (we'll handle this below)
        // For now, we need to prompt the user
        debugLog(`🎴 Joker selected. Choose action: Add chip or Remove opponent chip`)
        setToast('Choose Add or Remove for the Joker first')
        // We'll add UI for this
        return
      }
      
      if (jokerActionMode === 'add') {
        // Joker: add chip
        const addResult = wildCardAddChip(row, col, currentPlayer, board)
        if (!addResult.success) {
          debugLog(`❌ Cannot place chip with joker: ${addResult.error}`)
          setToast(addResult.error ?? 'You cannot place a chip there')
          return
        }
        
        // Remove card from hand
        const removedCard = currentHand.removeCard(selectedCard.id)
        if (!removedCard) {
          console.error('Failed to remove card from hand')
          return
        }
        
        // Add card to discard pile (prepend to keep most recent first)
        setDiscardPile(prev => [removedCard, ...prev])
        setLastMove({ row, col })
        setLastEvent(`${currentPlayer === 'red' ? 'Red' : 'Blue'} played a Joker`)
        
        // Update hand state
        const updatedHand = createHand()
        updatedHand.cards = [...currentHand.cards]
        if (currentPlayer === 'red') {
          setRedHand(updatedHand)
        } else {
          setBlueHand(updatedHand)
        }
        
        // Place chip
        setBoard(prevBoard => {
          const newBoard = prevBoard.map((r, rIdx) => 
            r.map((c, cIdx) => {
              if (rIdx === row && cIdx === col) {
                return {
                  ...c,
                  chip: currentPlayer,
                  scoreIds: c.scoreIds || []
                }
              }
              return c
            })
          )
          return newBoard
        })
        
        debugLog(`🎴 Joker played (ADD): Placed ${currentPlayer} chip at (${row}, ${col})`)
        setSelectedCard(null)
        setJokerActionMode(null)
        
        // Draw new card and END TURN (joker ends turn)
        drawCardForPlayer(currentPlayer, updatedHand)
        const nextPlayer: ChipColor = currentPlayer === 'red' ? 'blue' : 'red'
        setCurrentPlayer(nextPlayer)
        setHasBurnedThisTurn(false)
        setJokerActionMode(null)
        return
      } else {
        // Joker: remove opponent chip
        const opponentColor: ChipColor = currentPlayer === 'red' ? 'blue' : 'red'
        const removeResult = wildCardRemoveChip(row, col, opponentColor, board)
        if (!removeResult.success) {
          debugLog(`❌ Cannot remove chip with joker: ${removeResult.error}`)
          setToast(removeResult.error ?? 'You cannot remove that chip')
          return
        }
        
        // Remove card from hand
        const removedCard = currentHand.removeCard(selectedCard.id)
        if (!removedCard) {
          console.error('Failed to remove card from hand')
          return
        }
        
        // Add card to discard pile (prepend to keep most recent first)
        setDiscardPile(prev => [removedCard, ...prev])
        setLastMove({ row, col })
        setLastEvent(`${currentPlayer === 'red' ? 'Red' : 'Blue'} removed a ${opponentColor} chip with a Joker`)
        
        // Update hand state
        const updatedHand = createHand()
        updatedHand.cards = [...currentHand.cards]
        if (currentPlayer === 'red') {
          setRedHand(updatedHand)
        } else {
          setBlueHand(updatedHand)
        }
        
        // Remove chip from board
        setBoard(prevBoard => {
          const newBoard = prevBoard.map((r, rIdx) => 
            r.map((c, cIdx) => {
              if (rIdx === row && cIdx === col) {
                return {
                  ...c,
                  chip: null,
                  scoreIds: []
                }
              }
              return c
            })
          )
          return newBoard
        })
        
        debugLog(`🎴 Joker played (REMOVE): Removed ${opponentColor} chip from (${row}, ${col})`)
        setSelectedCard(null)
        setJokerActionMode(null)
        
        // Draw new card and END TURN (joker ends turn)
        drawCardForPlayer(currentPlayer, updatedHand)
        const nextPlayer: ChipColor = currentPlayer === 'red' ? 'blue' : 'red'
        setCurrentPlayer(nextPlayer)
        setHasBurnedThisTurn(false)
        setJokerActionMode(null)
        return
      }
    }
    
    // Regular card: validate card can be played at this position
    // This checks: bounds, card match, corner spaces, occupied cells, etc.
    const validationResult = validatePlayCard(selectedCard, row, col, board)
    if (!validationResult.success) {
      debugLog(`❌ Cannot play card: ${validationResult.error}`)
      setToast(validationResult.error ?? 'That card cannot be played there')
      debugLog(`  Card: ${selectedCard.rank} of ${selectedCard.suit}`)
      debugLog(`  Position: (${row}, ${col}) - ${cell.rank} of ${cell.suit}`)
      return
    }
    
    // All validation passed - proceed with chip placement
    // Capture current player before state update
    const playerToPlace = currentPlayer
    const nextPlayer: ChipColor = currentPlayer === 'red' ? 'blue' : 'red'
    
    // Remove card from hand
    const removedCard = currentHand.removeCard(selectedCard.id)
    if (!removedCard) {
      console.error('Failed to remove card from hand')
      return
    }
    
    // Add card to discard pile (prepend to keep most recent first)
    setDiscardPile(prev => [removedCard, ...prev])
    setLastMove({ row, col })
    setLastEvent(`${currentPlayer === 'red' ? 'Red' : 'Blue'} played ${cardLabel(removedCard)}`)
    
    // Update hand state to trigger re-render (hand now has card removed)
    const updatedHand = createHand()
    updatedHand.cards = [...currentHand.cards] // Cards array after removal
    if (currentPlayer === 'red') {
      setRedHand(updatedHand)
    } else {
      setBlueHand(updatedHand)
    }
    
    debugLog(`Playing ${selectedCard.rank}${selectedCard.suit === 'joker' ? '🃏' : selectedCard.suit[0]} at (${row}, ${col})`)
    debugLog(`  Hand now has ${updatedHand.cards.length} cards (card removed)`)
    
    // Place chip for current player
    setBoard(prevBoard => {
      // Create new board with updated cell
      const newBoard = prevBoard.map((r, rIdx) => 
        r.map((c, cIdx) => {
          if (rIdx === row && cIdx === col) {
            return {
              ...c,
              chip: playerToPlace,
              scoreIds: c.scoreIds || []
            }
          }
          return c
        })
      )
      
      return newBoard
    })
    
    // Clear selected card
    setSelectedCard(null)
    
    // Draw a new card for the player who just played (before switching turns)
    // Pass the updatedHand to avoid using stale state
    drawCardForPlayer(playerToPlace, updatedHand)
    
    // Toggle turns: red → blue → red → blue
    setCurrentPlayer(nextPlayer)
    // Reset burn status and joker action mode for new player's turn
    setHasBurnedThisTurn(false)
    setJokerActionMode(null)
  }
  
  /**
   * Pass: allowed when none of the current player's regular cards can be
   * played (wild cards are optional; burning first is optional too).
   */
  const handlePass = () => {
    if (winner || capMode || capArmed) return
    const hand = getCurrentPlayerHand()?.cards ?? []
    if (!canPassWith(hand, board, currentPlayer as Team)) {
      setToast('You have a regular card you can play, so you cannot pass')
      return
    }
    setSelectedCard(null)
    setJokerActionMode(null)
    setHasBurnedThisTurn(false)
    setLastEvent(`${currentPlayer === 'red' ? 'Red' : 'Blue'} passed`)
    setCurrentPlayer(currentPlayer === 'red' ? 'blue' : 'red')
  }
  
  /** Clear the board and deal a new game; the other team goes first */
  const startNewGame = () => {
    setBoard(() =>
      boardLayout.map(row =>
        row.map(cell => ({
          id: cell.id,
          row: cell.row,
          col: cell.col,
          rank: cell.rank,
          suit: cell.suit,
          isCorner: cell.isCorner,
          isRoyalBelt: cell.isRoyalBelt,
          chip: null,
          isCapped: false,
          scoreIds: [],
        }))
      )
    )
    setCappedScores([])
    setCapMode(null)
    setCapArmed(false)
    setSelectedCapCells([])
    const nextStartingPlayer: ChipColor = startingPlayer === 'red' ? 'blue' : 'red'
    setStartingPlayer(nextStartingPlayer)
    setCurrentPlayer(nextStartingPlayer)
    setWinner(null)
    setShowWinnerModal(false)
    setShowDiscardPileView(false)
    setLastMove(null)
    setLastEvent(`New game: ${nextStartingPlayer === 'red' ? 'Red' : 'Blue'} goes first`)
    // Reinitialize deck and hands (also resets the discard pile and burn status)
    initializeGame()
  }
  
  /** Capping is on from "Cap a score" until it's cancelled or nothing is left to cap */
  const capping = capArmed || capMode !== null
  
  /** One button for both teams: the first chip tapped picks the team */
  const toggleCapping = () => {
    setSelectedCapCells([])
    if (capping) {
      setCapArmed(false)
      setCapMode(null)
    } else {
      setCapArmed(true)
      setSelectedCard(null) // Clear any selected card when entering cap mode
      setJokerActionMode(null)
    }
  }
  
  // Count scores by color - each unique score (by direction) counts as 1
  const scoreCounts = {
    red: cappedScores.filter(s => s.color === 'red' && s.isCapped).length,
    blue: cappedScores.filter(s => s.color === 'blue' && s.isCapped).length,
    green: cappedScores.filter(s => s.color === 'green' && s.isCapped).length,
    yellow: cappedScores.filter(s => s.color === 'yellow' && s.isCapped).length,
  }
  
  // Stable click handlers: the memoized board cells and hand cards get the same
  // function every render, while the call still uses the latest handler and state.
  const latestHandlers = useRef({ handleCellClick, handleCardSelect })
  useLayoutEffect(() => {
    latestHandlers.current = { handleCellClick, handleCardSelect }
  })
  const onCellClick = useCallback((row: number, col: number) => latestHandlers.current.handleCellClick(row, col), [])
  const onCardSelect = useCallback((card: Card) => latestHandlers.current.handleCardSelect(card), [])

  const teamName = (team: ChipColor) => (team === 'red' ? 'Red' : 'Blue')
  const cardCounts = { red: redHand?.cards.length ?? 0, blue: blueHand?.cards.length ?? 0 }
  const deckCount = deck?.cards.length ?? 0

  // "Cap a score" lives in the hand box's action row (more room for the board)
  const capButton = (
    <button
      onClick={toggleCapping}
      disabled={!!winner}
      className={`flex items-center gap-1.5 rounded px-3 py-1 text-xs font-semibold text-white transition-colors disabled:opacity-50 ${
        capping ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-gray-700 hover:bg-gray-600'
      }`}
      title="Cap a score: tap a chip in the line, then the rest of its 5 squares. Either team can cap at any time."
    >
      <span className="flex h-4 w-4 items-center justify-center gap-px rounded-full bg-white">
        {capMode ? (
          <span className={`h-2 w-2 rounded-full ${capMode === 'red' ? 'bg-red-600' : 'bg-blue-600'}`} />
        ) : (
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
          </>
        )}
      </span>
      {capping ? 'Cancel capping' : 'Cap a score'}
    </button>
  )

  const capNotice = capping ? (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-yellow-500/60 bg-yellow-900/40 px-2 py-1.5">
      <span className="text-xs font-semibold text-yellow-200">
        {capMode
          ? `Capping for ${teamName(capMode)}: select 5 squares in a line (${selectedCapCells.length}/5)`
          : 'Capping: tap a chip in the line you want to cap (red or blue)'}
      </span>
      {selectedCapCells.length > 0 && (
        <button
          onClick={() => {
            setSelectedCapCells([])
            setCapMode(null) // stay in capping; the next chip picks the team again
          }}
          className="rounded bg-red-600 px-2 py-0.5 text-xs text-white hover:bg-red-700"
        >
          Clear selection
        </button>
      )}
    </div>
  ) : null

  return (
    <div className="w-full max-w-4xl mx-auto space-y-3">
      {/* Scoreboard (shared with online games) */}
      <Scoreboard
        red={{ score: scoreCounts.red, active: currentPlayer === 'red' && !winner, won: winner === 'red' }}
        blue={{ score: scoreCounts.blue, active: currentPlayer === 'blue' && !winner, won: winner === 'blue' }}
        status={winner ? `${teamName(winner)} wins!` : `${teamName(currentPlayer)}'s turn`}
        statusTone={winner ? 'win' : currentPlayer === 'red' ? 'red' : 'blue'}
        lastEvent={lastEvent}
      />

      {/* Current player's hand, with the deck and discard pile tucked into its bottom row */}
      <HandComponent
        hand={getCurrentPlayerHand()}
        selectedCardId={selectedCard?.id || null}
        onCardSelect={onCardSelect}
        onBurnCard={handleBurnCard}
        onJokerActionSelect={(action: 'add' | 'remove') => setJokerActionMode(action)}
        disabled={capping || !!winner}
        playerColor={currentPlayer === 'red' || currentPlayer === 'blue' ? currentPlayer : 'red'}
        canBurn={deckCount > 0}
        canPass={!winner && canPassWith(getCurrentPlayerHand()?.cards ?? [], board, currentPlayer as Team)}
        onPass={handlePass}
        hasBurned={hasBurnedThisTurn}
        selectedCard={selectedCard}
        jokerActionMode={jokerActionMode}
        orderKey={currentPlayer}
        title={`${teamName(currentPlayer)}'s hand`}
        actions={capButton}
        notice={capNotice}
        pile={
          <PileStrip
            discardPile={discardPile}
            deckCount={deckCount}
            onOpen={() => setShowDiscardPileView(true)}
            showShuffle={!deck || deckCount === 0 || (cardCounts.red === 0 && cardCounts.blue === 0)}
            onShuffle={shuffleAndDeal}
            shuffleDisabled={capping || !!winner}
          />
        }
      />

      <DiscardPileView
        discardPile={discardPile}
        isOpen={showDiscardPileView}
        onClose={() => setShowDiscardPileView(false)}
      />

      {/* Board: the outline glows in the color of the team whose turn it is */}
      <div
        className={`grid gap-0.5 sm:gap-1 p-1.5 sm:p-4 bg-gray-800 rounded-lg ${
          !winner && !capping ? (currentPlayer === 'red' ? 'ring-2 ring-red-500/60' : 'ring-2 ring-blue-500/60') : ''
        }`}
        style={{
          gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
          aspectRatio: '10 / 7',
        }}
      >
        {board.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <BoardCell
              key={`${rowIndex}-${colIndex}`}
              row={rowIndex}
              col={colIndex}
              cell={cell}
              capperColor={permanentCappers.get(`${rowIndex},${colIndex}`) ?? null}
              tempCapColor={
                capMode && selectedCapCells.some(c => c.row === rowIndex && c.col === colIndex)
                  ? capMode
                  : null
              }
              onCellClick={onCellClick}
              highlight={lastMove?.row === rowIndex && lastMove?.col === colIndex}
            />
          ))
        )}
      </div>

      {/* Short message when a move isn't allowed */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-[90vw] rounded-lg bg-gray-950/95 border border-gray-700 px-4 py-2 text-sm text-white shadow-xl animate-slideUp"
        >
          {toast}
        </div>
      )}

      {/* Winner */}
      {showWinnerModal && winner && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-800 rounded-xl p-6 sm:p-8 max-w-md w-full border-2 border-yellow-400 shadow-2xl text-center space-y-4 animate-slideUp">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">🎉 {winner.toUpperCase()} WINS! 🎉</h2>
            <p className="text-gray-300">{teamName(winner)} capped 4 scores.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={startNewGame}
                className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg"
              >
                New game
              </button>
              <button
                onClick={() => setShowWinnerModal(false)}
                className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg"
              >
                Review board
              </button>
            </div>
          </div>
        </div>
      )}
      {winner && !showWinnerModal && (
        <div className="fixed bottom-4 right-4 z-40">
          <button
            onClick={startNewGame}
            className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-xl"
          >
            New game
          </button>
        </div>
      )}
    </div>
  )
}
