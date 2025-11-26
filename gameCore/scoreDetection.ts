/**
 * Score detection and capping logic
 * Score = 5 consecutive chips in a row, column, or diagonal
 * Jokers count as wildcards for all teams
 */

import type { Cell, ChipColor, Score } from './types'
import { BOARD_SIZE, CHIPS_IN_SCORE } from './constants'

/**
 * Generate a unique score ID
 */
function generateScoreId(direction: Score['direction'], row: number, col: number): string {
  return `score-${direction}-${row}-${col}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Check if a cell matches a chip color (including joker wildcards and capped chips)
 */
function cellMatchesColor(cell: Cell | null | undefined, color: ChipColor): boolean {
  if (!cell) return false
  // Jokers (corners) match any color
  if (cell.isCorner) return true
  // Empty cells don't match
  if (!cell.chip) return false
  // Regular cells must match the color (including capped chips of the same color)
  // Capped chips (white cappers) of the same color can be used to form new scores
  return cell.chip === color
}

/**
 * Check a line of 5 consecutive cells for a score
 */
function checkLine(
  board: Cell[][],
  startRow: number,
  startCol: number,
  deltaRow: number,
  deltaCol: number,
  color: ChipColor,
  direction: Score['direction']
): Score | null {
  const cells: Array<{ row: number; col: number }> = []
  let jokerCount = 0
  let chipCount = 0
  
  // Check all 5 positions
  for (let i = 0; i < CHIPS_IN_SCORE; i++) {
    const row = startRow + deltaRow * i
    const col = startCol + deltaCol * i
    
    // Check bounds
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
      return null
    }
    
    const cell = board[row][col]
    
    // Count jokers (free squares - cannot have chips)
    if (cell.isCorner) {
      jokerCount++
      cells.push({ row, col })
      continue
    }
    
    // Check if cell has matching chip (jokers already handled above)
    if (cellMatchesColor(cell, color)) {
      chipCount++
      cells.push({ row, col })
    } else {
      return null // Cell doesn't match
    }
  }
  
  // Valid score: exactly 4 chips + 1 joker, OR 5 chips (no joker)
  if ((chipCount === 4 && jokerCount === 1) || (chipCount === 5 && jokerCount === 0)) {
    return {
      id: generateScoreId(direction, startRow, startCol),
      cells,
      color,
      direction,
      isCapped: false,
    }
  }
  
  return null
}

/**
 * Detect all scores (5 consecutive chips) on the board for a given color
 * Only returns scores that pass capped chip validation (max 1 capped chip)
 */
export function detectScores(
  board: Cell[][],
  chipColor: ChipColor,
  cappedScores: Score[] = []
): Score[] {
  const scores: Score[] = []
  const seenScoreIds = new Set<string>()
  
  // Helper to add score if unique and valid
  const addScore = (score: Score | null) => {
    if (!score) return
    
    // Validate capped chip rules BEFORE adding to results
    // This ensures scores with too many capped chips are filtered out
    if (!validateCappedChipsInScore(score, board, cappedScores)) {
      console.log(`detectScores: Score rejected by validation: ${score.direction} - too many capped chips`)
      return
    }
    
    // Create a signature to check for duplicates
    const signature = `${score.direction}-${score.cells.map(c => `${c.row},${c.col}`).join('|')}`
    if (!seenScoreIds.has(signature)) {
      seenScoreIds.add(signature)
      scores.push(score)
    }
  }
  
  // Check all possible starting positions for each direction
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      // Horizontal (left to right)
      if (col <= BOARD_SIZE - CHIPS_IN_SCORE) {
        addScore(checkLine(board, row, col, 0, 1, chipColor, 'horizontal'))
      }
      
      // Vertical (top to bottom)
      if (row <= BOARD_SIZE - CHIPS_IN_SCORE) {
        addScore(checkLine(board, row, col, 1, 0, chipColor, 'vertical'))
      }
      
      // Diagonal (top-left to bottom-right)
      if (row <= BOARD_SIZE - CHIPS_IN_SCORE && col <= BOARD_SIZE - CHIPS_IN_SCORE) {
        addScore(checkLine(board, row, col, 1, 1, chipColor, 'diagonal'))
      }
      
      // Anti-diagonal (top-right to bottom-left)
      if (row <= BOARD_SIZE - CHIPS_IN_SCORE && col >= CHIPS_IN_SCORE - 1) {
        addScore(checkLine(board, row, col, 1, -1, chipColor, 'anti-diagonal'))
      }
    }
  }
  
  return scores
}

/**
 * Check if 5 selected cells form a valid consecutive line
 * Returns the direction if valid, null otherwise
 */
export function validateConsecutiveLine(
  selectedCells: Array<{ row: number; col: number }>,
  board: Cell[][],
  chipColor: ChipColor
): Score | null {
  if (selectedCells.length !== CHIPS_IN_SCORE) {
    return null
  }

  // Sort cells by row, then col for easier checking
  const sorted = [...selectedCells].sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row
    return a.col - b.col
  })

  // Count jokers and chips
  let jokerCount = 0
  let chipCount = 0
  
  // Check if all cells are valid (jokers or matching chips)
  for (const { row, col } of sorted) {
    const cell = board[row]?.[col]
    if (!cell) {
      console.log(`validateConsecutiveLine: Cell ${row},${col} is null`)
      return null
    }
    
    // Jokers are free squares (cannot have chips or cappers)
    if (cell.isCorner) {
      jokerCount++
      continue
    }
    
    // Check for valid chip (matching color or capped chip of same color)
    if (cell.isCapped && cell.chip === chipColor) {
      // Capped cell of same color is valid - can be reused for additional scores
      chipCount++
      continue
    }
    
    // Use cellMatchesColor for regular chips
    if (!cellMatchesColor(cell, chipColor)) {
      console.log(`validateConsecutiveLine: Cell ${row},${col} doesn't match: chip=${cell.chip}, isCapped=${cell.isCapped}, chipColor=${chipColor}`)
      return null
    }
    
    chipCount++
  }
  
  // Valid: exactly 4 chips + 1 joker, OR 5 chips (no joker)
  if (!((chipCount === 4 && jokerCount === 1) || (chipCount === 5 && jokerCount === 0))) {
    console.log(`validateConsecutiveLine: Invalid chip/joker count: chips=${chipCount}, jokers=${jokerCount}`)
    return null
  }
  
  console.log(`validateConsecutiveLine: Valid score detected - chips=${chipCount}, jokers=${jokerCount}`)

  // Check horizontal (all same row, consecutive cols)
  const isHorizontal = sorted.every((cell, i) => 
    cell.row === sorted[0].row && 
    (i === 0 || cell.col === sorted[i - 1].col + 1)
  )
  if (isHorizontal) {
    return {
      id: generateScoreId('horizontal', sorted[0].row, sorted[0].col),
      cells: sorted,
      color: chipColor,
      direction: 'horizontal',
      isCapped: false,
    }
  }

  // Check vertical (all same col, consecutive rows)
  const isVertical = sorted.every((cell, i) => 
    cell.col === sorted[0].col && 
    (i === 0 || cell.row === sorted[i - 1].row + 1)
  )
  if (isVertical) {
    return {
      id: generateScoreId('vertical', sorted[0].row, sorted[0].col),
      cells: sorted,
      color: chipColor,
      direction: 'vertical',
      isCapped: false,
    }
  }

  // Check diagonal (top-left to bottom-right: row and col both increase by 1)
  const isDiagonal = sorted.every((cell, i) => 
    i === 0 || (cell.row === sorted[i - 1].row + 1 && cell.col === sorted[i - 1].col + 1)
  )
  if (isDiagonal) {
    return {
      id: generateScoreId('diagonal', sorted[0].row, sorted[0].col),
      cells: sorted,
      color: chipColor,
      direction: 'diagonal',
      isCapped: false,
    }
  }

  // Check anti-diagonal (top-right to bottom-left: row increases, col decreases)
  const isAntiDiagonal = sorted.every((cell, i) => 
    i === 0 || (cell.row === sorted[i - 1].row + 1 && cell.col === sorted[i - 1].col - 1)
  )
  if (isAntiDiagonal) {
    return {
      id: generateScoreId('anti-diagonal', sorted[0].row, sorted[0].col),
      cells: sorted,
      color: chipColor,
      direction: 'anti-diagonal',
      isCapped: false,
    }
  }

  // Not a valid consecutive line
  return null
}

/**
 * Validate that capped chips in a new score follow the strict rules:
 * - Max 2 capped chips from existing scores, but they MUST come from two different scores
 * - When 2 capped chips are used, you need exactly 3 uncapped chips (or 2 uncapped + 1 joker)
 * - When 1 capped chip is used, you need exactly 4 uncapped chips (or 3 uncapped + 1 joker)
 * - When 0 capped chips are used, you need 5 chips (or 4 chips + 1 joker)
 * 
 * This ensures capped chips come from different existing scores and are in addition to the required uncapped chips.
 */
export function validateCappedChipsInScore(
  newScore: Score,
  board: Cell[][],
  cappedScores: Score[]
): boolean {
  // Count ALL chips in the score to verify the composition
  let uncappedChipCount = 0
  let cappedChipCount = 0
  let jokerCount = 0
  const cappedCellPositions: Array<{ row: number; col: number }> = []
  
  for (const { row, col } of newScore.cells) {
    const cell = board[row][col]
    if (!cell) continue
    
    // Skip jokers
    if (cell.isCorner) {
      jokerCount++
      continue
    }
    
    // Count capped chips (white cappers of the same color)
    if (cell.isCapped && cell.chip === newScore.color) {
      cappedChipCount++
      cappedCellPositions.push({ row, col })
      continue
    }
    
    // Count regular chips (uncapped chips of the correct color)
    if (cell.chip === newScore.color && !cell.isCapped) {
      uncappedChipCount++
    }
  }
  
  console.log(`validateCappedChipsInScore: Score composition - ${cappedChipCount} capped, ${uncappedChipCount} uncapped, ${jokerCount} jokers`)
  
  // STRICT RULE: Max 2 capped chips allowed, but they must come from different scores
  if (cappedChipCount > 2) {
    console.log(`validateCappedChipsInScore: INVALID - Too many capped chips: ${cappedChipCount} (max 2 allowed)`)
    console.log(`  Capped cell positions:`, cappedCellPositions.map(c => `${c.row},${c.col}`))
    return false
  }
  
  // If 0 capped chips, it's valid (no capped chips used, need 5 regular chips or 4 + joker)
  if (cappedChipCount === 0) {
    // Verify total is 5: either 5 uncapped chips, or 4 uncapped + 1 joker
    const total = uncappedChipCount + jokerCount
    if (total === 5) {
      return true
    }
    console.log(`validateCappedChipsInScore: INVALID - With 0 capped chips, need 5 total. Found: ${uncappedChipCount} uncapped, ${jokerCount} jokers, total: ${total}`)
    return false
  }
  
  // If 1 capped chip, verify:
  // 1. The cell belongs to at least one capped score (ensures it's from an existing score)
  // 2. There are exactly 4 uncapped chips (not capped chips)
  if (cappedChipCount === 1) {
    const cappedCellPos = cappedCellPositions[0]
    
    // Verify the capped cell belongs to at least one capped score
    // This ensures the capped chip comes from an existing score
    const cellScores = cappedScores.filter(score => {
      if (score.color !== newScore.color || !score.isCapped) return false
      return score.cells.some(c => c.row === cappedCellPos.row && c.col === cappedCellPos.col)
    })
    
    if (cellScores.length === 0) {
      console.log(`validateCappedChipsInScore: INVALID - Capped cell doesn't belong to any capped score`)
      console.log(`  Capped cell at ${cappedCellPos.row},${cappedCellPos.col} must be part of an existing capped score`)
      return false
    }
    
    // STRICT: When 1 capped chip is used, need exactly 4 uncapped chips (or 3 uncapped + 1 joker)
    // Total should be: 1 capped + 4 uncapped = 5, OR 1 capped + 3 uncapped + 1 joker = 5
    const requiredUncappedChips = 4 - jokerCount
    
    if (uncappedChipCount !== requiredUncappedChips) {
      console.log(`validateCappedChipsInScore: INVALID - With 1 capped chip and ${jokerCount} jokers, need exactly ${requiredUncappedChips} uncapped chips. Found: ${uncappedChipCount}`)
      console.log(`  This ensures only 1 capped chip per existing score is used`)
      return false
    }
    
    // Verify total is 5
    const totalChips = cappedChipCount + uncappedChipCount + jokerCount
    if (totalChips !== 5) {
      console.log(`validateCappedChipsInScore: INVALID - Total chips must be 5. Found: ${totalChips} (${cappedChipCount} capped + ${uncappedChipCount} uncapped + ${jokerCount} jokers)`)
      return false
    }
    
    console.log(`validateCappedChipsInScore: VALID - 1 capped chip (from existing score) + ${uncappedChipCount} uncapped chips + ${jokerCount} jokers`)
    return true
  }
  
  // If 2 capped chips, verify:
  // 1. They come from two different capped scores
  // 2. There are exactly 3 uncapped chips (or 2 uncapped + 1 joker)
  if (cappedChipCount === 2) {
    const cappedCell1Pos = cappedCellPositions[0]
    const cappedCell2Pos = cappedCellPositions[1]
    
    // Get the scores that each capped cell belongs to
    const cappedCell1Scores = cappedScores.filter(score => {
      if (score.color !== newScore.color || !score.isCapped) return false
      return score.cells.some(c => c.row === cappedCell1Pos.row && c.col === cappedCell1Pos.col)
    })
    
    const cappedCell2Scores = cappedScores.filter(score => {
      if (score.color !== newScore.color || !score.isCapped) return false
      return score.cells.some(c => c.row === cappedCell2Pos.row && c.col === cappedCell2Pos.col)
    })
    
    if (cappedCell1Scores.length === 0 || cappedCell2Scores.length === 0) {
      console.log(`validateCappedChipsInScore: INVALID - One or both capped cells don't belong to any capped score`)
      return false
    }
    
    // Check if the two capped cells come from different scores
    // They must not share any common score IDs
    const cell1ScoreIds = new Set(cappedCell1Scores.map(s => s.id))
    const cell2ScoreIds = new Set(cappedCell2Scores.map(s => s.id))
    const sharedScores = Array.from(cell1ScoreIds).filter(id => cell2ScoreIds.has(id))
    
    if (sharedScores.length > 0) {
      console.log(`validateCappedChipsInScore: INVALID - Both capped chips come from the same score(s)`)
      console.log(`  Shared score IDs:`, sharedScores)
      console.log(`  Cell 1 at ${cappedCell1Pos.row},${cappedCell1Pos.col} belongs to scores:`, Array.from(cell1ScoreIds))
      console.log(`  Cell 2 at ${cappedCell2Pos.row},${cappedCell2Pos.col} belongs to scores:`, Array.from(cell2ScoreIds))
      return false
    }
    
    // When 2 capped chips are used, need exactly 3 uncapped chips (or 2 uncapped + 1 joker)
    const requiredUncappedChips = 3 - jokerCount
    
    if (uncappedChipCount !== requiredUncappedChips) {
      console.log(`validateCappedChipsInScore: INVALID - With 2 capped chips and ${jokerCount} jokers, need exactly ${requiredUncappedChips} uncapped chips. Found: ${uncappedChipCount}`)
      return false
    }
    
    // Verify total is 5
    const totalChips = cappedChipCount + uncappedChipCount + jokerCount
    if (totalChips !== 5) {
      console.log(`validateCappedChipsInScore: INVALID - Total chips must be 5. Found: ${totalChips} (${cappedChipCount} capped + ${uncappedChipCount} uncapped + ${jokerCount} jokers)`)
      return false
    }
    
    console.log(`validateCappedChipsInScore: VALID - 2 capped chips (from different scores) + ${uncappedChipCount} uncapped chips + ${jokerCount} jokers`)
    return true
  }
  
  // Should never reach here
  console.log(`validateCappedChipsInScore: ERROR - Unexpected capped chip count: ${cappedChipCount}`)
  return false
}

/**
 * Check for new scores after placing a chip at a specific position
 */
export function checkForNewScores(
  board: Cell[][],
  row: number,
  col: number,
  chipColor: ChipColor,
  cappedScores: Score[] = []
): Score[] {
  const newScores: Score[] = []
  const seenSignatures = new Set<string>()
  
  // Helper to check a line passing through the placed chip
  const checkLineThroughPosition = (
    startRow: number,
    startCol: number,
    deltaRow: number,
    deltaCol: number,
    direction: Score['direction']
  ) => {
    const cells: Array<{ row: number; col: number }> = []
    let includesPlacedChip = false
    let jokerCount = 0
    let chipCount = 0
    
    // Check all 5 positions in this line
    for (let i = 0; i < CHIPS_IN_SCORE; i++) {
      const checkRow = startRow + deltaRow * i
      const checkCol = startCol + deltaCol * i
      
      // Check bounds
      if (checkRow < 0 || checkRow >= BOARD_SIZE || checkCol < 0 || checkCol >= BOARD_SIZE) {
        return null
      }
      
      const cell = board[checkRow][checkCol]
      
      // Check if this position includes the newly placed chip
      if (checkRow === row && checkCol === col) {
        includesPlacedChip = true
      }
      
      // Count jokers (free squares - cannot have chips)
      if (cell.isCorner) {
        jokerCount++
        cells.push({ row: checkRow, col: checkCol })
        continue
      }
      
      // Check if cell has matching chip (jokers already handled above)
      if (cellMatchesColor(cell, chipColor)) {
        chipCount++
        cells.push({ row: checkRow, col: checkCol })
      } else {
        return null // Cell doesn't match
      }
    }
    
    // Must include the newly placed chip
    if (!includesPlacedChip) {
      return null
    }
    
    // Valid score: exactly 4 chips + 1 joker, OR 5 chips (no joker)
    if (!((chipCount === 4 && jokerCount === 1) || (chipCount === 5 && jokerCount === 0))) {
      return null
    }
    
    // Create score signature to avoid duplicates
    const signature = `${direction}-${cells.map(c => `${c.row},${c.col}`).sort().join('|')}`
    if (seenSignatures.has(signature)) {
      return null
    }
    seenSignatures.add(signature)
    
    const score: Score = {
      id: generateScoreId(direction, startRow, startCol),
      cells,
      color: chipColor,
      direction,
      isCapped: false,
    }
    
    // Validate capped chip rules
    if (validateCappedChipsInScore(score, board, cappedScores)) {
      return score
    }
    
    return null
  }
  
  // Check all possible lines passing through this position
  // We need to check lines that could include this position at any of the 5 positions
  
  for (let offset = 0; offset < CHIPS_IN_SCORE; offset++) {
    // Horizontal lines
    const startColH = col - offset
    if (startColH >= 0 && startColH <= BOARD_SIZE - CHIPS_IN_SCORE) {
      const score = checkLineThroughPosition(row, startColH, 0, 1, 'horizontal')
      if (score) newScores.push(score)
    }
    
    // Vertical lines
    const startRowV = row - offset
    if (startRowV >= 0 && startRowV <= BOARD_SIZE - CHIPS_IN_SCORE) {
      const score = checkLineThroughPosition(startRowV, col, 1, 0, 'vertical')
      if (score) newScores.push(score)
    }
    
    // Diagonal lines (top-left to bottom-right)
    const startRowD = row - offset
    const startColD = col - offset
    if (startRowD >= 0 && startRowD <= BOARD_SIZE - CHIPS_IN_SCORE &&
        startColD >= 0 && startColD <= BOARD_SIZE - CHIPS_IN_SCORE) {
      const score = checkLineThroughPosition(startRowD, startColD, 1, 1, 'diagonal')
      if (score) newScores.push(score)
    }
    
    // Anti-diagonal lines (top-right to bottom-left)
    const startRowAD = row - offset
    const startColAD = col + offset
    if (startRowAD >= 0 && startRowAD <= BOARD_SIZE - CHIPS_IN_SCORE &&
        startColAD >= CHIPS_IN_SCORE - 1 && startColAD < BOARD_SIZE) {
      const score = checkLineThroughPosition(startRowAD, startColAD, 1, -1, 'anti-diagonal')
      if (score) newScores.push(score)
    }
  }
  
  return newScores
}

/**
 * Cap a score (mark as permanent, cannot be removed)
 */
export function capScore(
  board: Cell[][],
  score: Score
): void {
  // Mark the score as capped
  score.isCapped = true
  
  // Update each cell in the score
  score.cells.forEach(({ row, col }) => {
    const cell = board[row][col]
    if (cell) {
      // Jokers cannot be capped (they're free squares)
      if (cell.isCorner) {
        // Still track score ID for jokers, but don't mark as capped
        if (!cell.scoreIds) {
          cell.scoreIds = []
        }
        if (!cell.scoreIds.includes(score.id)) {
          cell.scoreIds.push(score.id)
        }
        return // Don't mark jokers as capped
      }
      
      // Add this score ID to the cell's scoreIds array
      if (!cell.scoreIds) {
        cell.scoreIds = []
      }
      if (!cell.scoreIds.includes(score.id)) {
        cell.scoreIds.push(score.id)
      }
      
      // Mark cell as capped (for visual indication)
      cell.isCapped = true
    }
  })
}

/**
 * Check if player has won (4 total capped scores)
 */
export function checkWinCondition(cappedScores: Score[]): ChipColor | null {
  const scoresByColor = new Map<ChipColor, number>()
  
  // Count capped scores per color
  for (const score of cappedScores) {
    if (score.isCapped) {
      const count = scoresByColor.get(score.color) || 0
      scoresByColor.set(score.color, count + 1)
    }
  }
  
  // Check if any player has 4 scores
  for (const [color, count] of Array.from(scoresByColor.entries())) {
    if (count >= 4) {
      return color
    }
  }
  
  return null
}
