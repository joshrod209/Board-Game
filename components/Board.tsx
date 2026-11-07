'use client'

import { useState, useEffect, useMemo, useCallback, useLayoutEffect, useRef } from 'react'
import type { Cell, ChipColor, Score, Deck, Hand, Card } from '@/gameCore/types'
import { BOARD_SIZE, INITIAL_HAND_SIZE } from '@/gameCore/constants'
import { boardLayout } from '@/gameCore/boardLayout'
import { detectScores, capScore, checkWinCondition, validateCappedChipsInScore, validateConsecutiveLine } from '@/gameCore/scoreDetection'
import { initializeDeck } from '@/gameCore/deck'
import { createHand } from '@/gameCore/hand'
import { canPlayCard, playCard as validatePlayCard } from '@/gameCore/playCard'
import { isCardPlayable, burnCard } from '@/gameCore/burnRule'
import { wildCardAddChip, wildCardRemoveChip } from '@/gameCore/jokerLogic'
import { debugLog } from '@/gameCore/debug'
import BoardCell from './BoardCell'
import HandComponent from './Hand'
import DiscardPile from './DiscardPile'
import DiscardPileView from './DiscardPileView'

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
  const [capMode, setCapMode] = useState<ChipColor | null>(null) // Which player is in cap mode
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
    if (capMode) {
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
      return
    }
    
    if (!deck || !board) {
      debugLog('Game not initialized')
      return
    }
    
    if (hasBurnedThisTurn) {
      debugLog('You have already burned a card this turn. Only one burn per turn allowed.')
      return
    }
    
    if (capMode) {
      debugLog('Cannot burn cards while in cap mode')
      return
    }
    
    // Get current player's hand
    const currentHand = getCurrentPlayerHand()
    if (!currentHand || !currentHand.hasCard(selectedCard.id)) {
      debugLog('Selected card is not in your hand')
      return
    }
    
    // Validate card is unplayable
    if (isCardPlayable(selectedCard, board)) {
      debugLog('Card is playable. Cannot burn playable cards. Play the card instead.')
      return
    }
    
    // Execute burn: remove card and draw new one
    const burnResult = burnCard(selectedCard, board, deck)
    
    if (!burnResult.success) {
      console.error(`Burn failed: ${burnResult.error}`)
      return
    }
    
    // Remove burned card from hand
    const removedCard = currentHand.removeCard(selectedCard.id)
    if (!removedCard) {
      console.error('Failed to remove burned card from hand')
      return
    }
    
    // Add burned card to discard pile (prepend to keep most recent first)
    setDiscardPile(prev => [removedCard, ...prev])
    
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
            }
          } else {
            // Invalid selection - let them try again or clear manually
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
      
      // Draw new card and CONTINUE TURN (two-eyed jack doesn't end turn)
      drawCardForPlayer(currentPlayer, updatedHand)
      return
    }
    
    if (selectedCard.wildCardType === 'oneEyedJack') {
      // One-eyed jack: remove opponent's uncapped chip
      const opponentColor: ChipColor = currentPlayer === 'red' ? 'blue' : 'red'
      const removeResult = wildCardRemoveChip(row, col, opponentColor, board)
      if (!removeResult.success) {
        debugLog(`❌ Cannot remove chip with one-eyed jack: ${removeResult.error}`)
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
        // We'll add UI for this
        return
      }
      
      if (jokerActionMode === 'add') {
        // Joker: add chip
        const addResult = wildCardAddChip(row, col, currentPlayer, board)
        if (!addResult.success) {
          debugLog(`❌ Cannot place chip with joker: ${addResult.error}`)
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

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {/* Score display */}
      <div className="bg-gray-800 rounded-lg p-4 flex justify-around items-center">
        <div className="text-center">
          <div className="text-white font-bold text-sm mb-1">Red</div>
          <div className="text-2xl font-bold text-red-500">{scoreCounts.red}/4</div>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-300 mb-1">Current</div>
          <div className={`text-2xl font-bold ${currentPlayer === 'red' ? 'text-red-500' : 'text-blue-500'}`}>{currentPlayer}</div>
        </div>
        <div className="text-center">
          <div className="text-white font-bold text-sm mb-1">Blue</div>
          <div className="text-2xl font-bold text-blue-500">{scoreCounts.blue}/4</div>
        </div>
      </div>

      {/* Current player's hand and discard pile */}
      <div className="flex gap-4 items-start">
        <div className="flex-1">
          <HandComponent
            hand={getCurrentPlayerHand()}
            selectedCardId={selectedCard?.id || null}
            onCardSelect={onCardSelect}
            onBurnCard={handleBurnCard}
            onJokerActionSelect={(action: 'add' | 'remove') => setJokerActionMode(action)}
            disabled={!!capMode || !!winner}
            playerColor={currentPlayer === 'red' || currentPlayer === 'blue' ? currentPlayer : 'red'}
            canBurn={selectedCard ? !isCardPlayable(selectedCard, board) : false}
            hasBurned={hasBurnedThisTurn}
            selectedCard={selectedCard}
            jokerActionMode={jokerActionMode}
          />
        </div>
        <div className="flex-shrink-0 flex flex-col gap-2">
          {/* Shuffle and Deal button - show when deck is empty or both players have zero cards */}
          {(!deck || 
            deck.cards.length === 0 || 
            ((redHand?.cards.length === 0 && blueHand?.cards.length === 0))) && (
            <button
              onClick={shuffleAndDeal}
              disabled={!!capMode || !!winner}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors shadow-lg"
              title="Shuffle the deck and deal 5 cards to each player"
            >
              🔀 Shuffle & Deal
            </button>
          )}
          <DiscardPile
            discardPile={discardPile}
            onClick={() => setShowDiscardPileView(true)}
          />
        </div>
      </div>
      
      {/* Discard Pile View Modal */}
      <DiscardPileView
        discardPile={discardPile}
        isOpen={showDiscardPileView}
        onClose={() => setShowDiscardPileView(false)}
      />

      {/* New Game button - appears after Review Board is clicked */}
      {winner && !showWinnerModal && (
        <div className="bg-gray-800 rounded-lg p-4 flex justify-center">
          <button
            onClick={() => {
              // Reset game
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
              setSelectedCapCells([])
              // Alternate starting player
              const nextStartingPlayer: ChipColor = startingPlayer === 'red' ? 'blue' : 'red'
              setStartingPlayer(nextStartingPlayer)
              setCurrentPlayer(nextStartingPlayer)
              setWinner(null)
              setShowDiscardPileView(false) // Close discard pile view if open
              // Reinitialize deck and hands (this will also reset discard pile)
              initializeGame()
              // Reset burn status
              setHasBurnedThisTurn(false)
            }}
            className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors text-lg shadow-lg"
          >
            New Game
          </button>
        </div>
      )}

      {/* Player chip area - in front of board but outside playable area */}
      <div className="flex justify-center items-center gap-4">
        {/* Red chip stack */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            {/* Stacked red chips */}
            <div className="w-12 h-12 rounded-full bg-red-600 border-2 border-white shadow-lg" style={{ imageRendering: 'crisp-edges', backfaceVisibility: 'hidden' }} />
            <div className="absolute top-0 left-0 w-12 h-12 rounded-full bg-red-600 border-2 border-white shadow-lg" style={{ transform: 'translateY(-4px)', opacity: 1, imageRendering: 'crisp-edges', backfaceVisibility: 'hidden', WebkitFontSmoothing: 'antialiased' }} />
            <div className="absolute top-0 left-0 w-12 h-12 rounded-full bg-red-600 border-2 border-white shadow-lg" style={{ transform: 'translateY(-8px)', opacity: 1, imageRendering: 'crisp-edges', backfaceVisibility: 'hidden', WebkitFontSmoothing: 'antialiased' }} />
          </div>
          <div className="text-white text-xs font-semibold">Red Chips</div>
        </div>

        {/* White chips with red circles - stacked, next to chip stack */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={() => {
              if (capMode === 'red') {
                // Exit cap mode and clear selection
                setCapMode(null)
                setSelectedCapCells([])
              } else {
                // Enter cap mode for red
                setCapMode('red')
                setSelectedCapCells([])
                setSelectedCard(null) // Clear any selected card when entering cap mode
                setJokerActionMode(null) // Clear joker action mode
              }
            }}
            className={`relative w-12 h-12 rounded-full bg-white border-2 ${capMode === 'red' ? 'border-yellow-400 ring-2 ring-yellow-400' : 'border-gray-400'} shadow-lg hover:scale-110 transition-transform cursor-pointer flex items-center justify-center group`}
            title={capMode === 'red' ? 'Click to exit cap mode' : 'Click to enter cap mode, then select 5 cells to cap'}
          >
            {/* Small red circle inside white chip */}
            <div className="w-6 h-6 rounded-full bg-red-600" />
            
            {/* Stacked effect - additional chips behind */}
            <div className="absolute top-0 left-0 w-12 h-12 rounded-full bg-white border-2 border-gray-400 shadow-lg pointer-events-none flex items-center justify-center" style={{ transform: 'translateY(-4px)', opacity: 1, imageRendering: 'crisp-edges', backfaceVisibility: 'hidden', WebkitFontSmoothing: 'antialiased' }}>
              <div className="w-6 h-6 rounded-full bg-red-600" />
            </div>
            <div className="absolute top-0 left-0 w-12 h-12 rounded-full bg-white border-2 border-gray-400 shadow-lg pointer-events-none flex items-center justify-center" style={{ transform: 'translateY(-8px)', opacity: 1, imageRendering: 'crisp-edges', backfaceVisibility: 'hidden', WebkitFontSmoothing: 'antialiased' }}>
              <div className="w-6 h-6 rounded-full bg-red-600" />
            </div>
            
            {/* Subtle glow on hover */}
            <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-30 transition-opacity bg-red-500" />
          </button>
          <div className="text-white text-xs font-semibold">Red Capper</div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Blue chip stack */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            {/* Stacked blue chips */}
            <div className="w-12 h-12 rounded-full bg-blue-600 border-2 border-white shadow-lg" style={{ imageRendering: 'crisp-edges', backfaceVisibility: 'hidden' }} />
            <div className="absolute top-0 left-0 w-12 h-12 rounded-full bg-blue-600 border-2 border-white shadow-lg" style={{ transform: 'translateY(-4px)', opacity: 1, imageRendering: 'crisp-edges', backfaceVisibility: 'hidden', WebkitFontSmoothing: 'antialiased' }} />
            <div className="absolute top-0 left-0 w-12 h-12 rounded-full bg-blue-600 border-2 border-white shadow-lg" style={{ transform: 'translateY(-8px)', opacity: 1, imageRendering: 'crisp-edges', backfaceVisibility: 'hidden', WebkitFontSmoothing: 'antialiased' }} />
          </div>
          <div className="text-white text-xs font-semibold">Blue Chips</div>
        </div>

        {/* White chips with blue circles - stacked, next to chip stack */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={() => {
              if (capMode === 'blue') {
                // Exit cap mode and clear selection
                setCapMode(null)
                setSelectedCapCells([])
              } else {
                // Enter cap mode for blue
                setCapMode('blue')
                setSelectedCapCells([])
                setSelectedCard(null) // Clear any selected card when entering cap mode
                setJokerActionMode(null) // Clear joker action mode
              }
            }}
            className={`relative w-12 h-12 rounded-full bg-white border-2 ${capMode === 'blue' ? 'border-yellow-400 ring-2 ring-yellow-400' : 'border-gray-400'} shadow-lg hover:scale-110 transition-transform cursor-pointer flex items-center justify-center group`}
            title={capMode === 'blue' ? 'Click to exit cap mode' : 'Click to enter cap mode, then select 5 cells to cap'}
          >
            {/* Small blue circle inside white chip */}
            <div className="w-6 h-6 rounded-full bg-blue-600" />
            
            {/* Stacked effect - additional chips behind */}
            <div className="absolute top-0 left-0 w-12 h-12 rounded-full bg-white border-2 border-gray-400 shadow-lg pointer-events-none flex items-center justify-center" style={{ transform: 'translateY(-4px)', opacity: 1, imageRendering: 'crisp-edges', backfaceVisibility: 'hidden', WebkitFontSmoothing: 'antialiased' }}>
              <div className="w-6 h-6 rounded-full bg-blue-600" />
            </div>
            <div className="absolute top-0 left-0 w-12 h-12 rounded-full bg-white border-2 border-gray-400 shadow-lg pointer-events-none flex items-center justify-center" style={{ transform: 'translateY(-8px)', opacity: 1, imageRendering: 'crisp-edges', backfaceVisibility: 'hidden', WebkitFontSmoothing: 'antialiased' }}>
              <div className="w-6 h-6 rounded-full bg-blue-600" />
            </div>
            
            {/* Subtle glow on hover */}
            <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-30 transition-opacity bg-blue-500" />
          </button>
          <div className="text-white text-xs font-semibold">Blue Capper</div>
        </div>
      </div>

      {/* Cap mode indicator */}
      {capMode && (
        <div className="bg-yellow-900/50 border-2 border-yellow-500 rounded-lg p-2 text-center">
          <div className="text-yellow-200 font-bold">
            Cap Mode: {capMode.toUpperCase()} - Select 5 consecutive cells ({selectedCapCells.length}/5)
          </div>
          {selectedCapCells.length > 0 && (
            <button
              onClick={() => setSelectedCapCells([])}
              className="mt-2 px-4 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
            >
              Clear Selection
            </button>
          )}
        </div>
      )}
      
      <div
        className="grid gap-1 p-4 bg-gray-800 rounded-lg"
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
            />
          ))
        )}
      </div>
      
      {/* Winner Modal */}
      {showWinnerModal && winner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4 border-2 border-yellow-400 shadow-2xl">
            <div className="text-center">
              <h2 className="text-4xl font-bold mb-4 text-white">
                🎉 {winner.toUpperCase()} WINS! 🎉
              </h2>
              <p className="text-gray-300 mb-6">
                Congratulations! {winner.toUpperCase()} has achieved 4 capped scores!
              </p>
              
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => {
                    setShowWinnerModal(false)
                    // Keep the board state for review
                  }}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Review Board
                </button>
                <button
                  onClick={() => {
                    // Reset game
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
                    setSelectedCapCells([])
                    // Alternate starting player
                    const nextStartingPlayer: ChipColor = startingPlayer === 'red' ? 'blue' : 'red'
                    setStartingPlayer(nextStartingPlayer)
                    setCurrentPlayer(nextStartingPlayer)
                    setWinner(null)
                    setShowWinnerModal(false)
                    setShowDiscardPileView(false) // Close discard pile view if open
                    // Reinitialize deck and hands (this will also reset discard pile)
                    initializeGame()
                  }}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                >
                  New Game
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
