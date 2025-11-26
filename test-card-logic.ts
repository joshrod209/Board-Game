/**
 * Manual test script for card logic
 * 
 * Run with: npx tsx test-card-logic.ts
 * (Or: npm install -g tsx && tsx test-card-logic.ts)
 * 
 * Alternative: Use ts-node if you have it installed
 */

import { initializeDeck, createFullDeck } from './gameCore/deck'
import { canPlayCard, playCard } from './gameCore/playCard'
import { boardLayout } from './gameCore/boardLayout'
import type { Card, Cell } from './gameCore/types'

console.log('🧪 Testing Card Logic\n')
console.log('=' .repeat(50))

// ==========================================
// DECK TESTS
// ==========================================
console.log('\n📦 DECK TESTS\n')

// Test 1: Initial deck size
console.log('Test 1: Initial deck size')
const fullDeck = createFullDeck()
console.log(`✓ Full deck has ${fullDeck.length} cards (expected: 108 - 104 regular + 4 jokers)`)

// Test 2: Initialize and shuffle
console.log('\nTest 2: Initialize and shuffle')
const deck = initializeDeck()
const initialSize = deck.cards.length
console.log(`✓ Initial deck size: ${initialSize} cards`)
deck.shuffle()
const afterShuffleSize = deck.cards.length
console.log(`✓ After shuffle: ${afterShuffleSize} cards`)
console.log(`  ${initialSize === afterShuffleSize ? '✓' : '✗'} Size unchanged: ${initialSize === afterShuffleSize}`)

// Test 3: Draw cards
console.log('\nTest 3: Draw cards')
const drawnCards: Card[] = []
for (let i = 0; i < 5; i++) {
  const card = deck.draw()
  if (card) {
    drawnCards.push(card)
    console.log(`  Drew: ${card.rank} of ${card.suit}`)
  }
}
console.log(`✓ Drew ${drawnCards.length} cards`)
console.log(`✓ Remaining deck size: ${deck.cards.length} cards (expected: ${initialSize - 5})`)

// Test 4: Draw until empty
console.log('\nTest 4: Draw until empty')
let emptyDraws = 0
while (deck.draw() !== null) {
  // Keep drawing
}
const lastDraw = deck.draw()
console.log(`✓ Last draw after emptying: ${lastDraw === null ? 'null (correct)' : 'ERROR - should be null'}`)

// Test 5: Reset deck
console.log('\nTest 5: Reset deck')
deck.reset()
console.log(`✓ Reset deck size: ${deck.cards.length} cards (expected: 108)`)
console.log(`  ${deck.cards.length === 108 ? '✓' : '✗'} Reset successful: ${deck.cards.length === 108}`)

// Test 5b: Verify jokers in deck
console.log('\nTest 5b: Verify jokers in deck')
const jokerCount = deck.cards.filter(c => c.suit === 'joker' || c.rank === 'Joker').length
console.log(`✓ Jokers in deck: ${jokerCount} (expected: 4)`)
console.log(`  ${jokerCount === 4 ? '✓' : '✗'} Joker count correct: ${jokerCount === 4}`)

// ==========================================
// CARD VALIDATION TESTS
// ==========================================
console.log('\n\n🎴 CARD VALIDATION TESTS\n')

// Create a test board (use boardLayout)
const testBoard = boardLayout.map(row => 
  row.map(cell => ({ ...cell }))
)

// Helper to find a cell by rank/suit
function findCell(rank: string, suit: string): Cell | null {
  for (const row of testBoard) {
    for (const cell of row) {
      if (cell.rank === rank && cell.suit === suit) {
        return cell
      }
    }
  }
  return null
}

// Test 6: Valid card play
console.log('Test 6: Valid card play')
const testCard1: Card = { rank: '9', suit: 'clubs', id: 'test-1' }
const cell9Clubs = findCell('9', 'clubs')
if (cell9Clubs) {
  const canPlay = canPlayCard(testCard1, cell9Clubs.row, cell9Clubs.col, testBoard)
  console.log(`  Playing ${testCard1.rank} of ${testCard1.suit} at (${cell9Clubs.row}, ${cell9Clubs.col})`)
  console.log(`  ${canPlay ? '✓' : '✗'} Can play: ${canPlay} (expected: true)`)
  
  const result = playCard(testCard1, cell9Clubs.row, cell9Clubs.col, testBoard)
  console.log(`  ${result.success ? '✓' : '✗'} Play result: ${result.success ? 'SUCCESS' : `FAILED - ${result.error}`}`)
} else {
  console.log('  ✗ Could not find 9 of clubs on board')
}

// Test 7: Invalid card play (wrong rank)
console.log('\nTest 7: Invalid card play (wrong rank)')
const testCard2: Card = { rank: 'K', suit: 'clubs', id: 'test-2' }
const cell9Clubs2 = findCell('9', 'clubs')
if (cell9Clubs2) {
  const canPlay = canPlayCard(testCard2, cell9Clubs2.row, cell9Clubs2.col, testBoard)
  console.log(`  Trying to play ${testCard2.rank} of ${testCard2.suit} on 9 of clubs`)
  console.log(`  ${!canPlay ? '✓' : '✗'} Can play: ${canPlay} (expected: false)`)
  
  const result = playCard(testCard2, cell9Clubs2.row, cell9Clubs2.col, testBoard)
  console.log(`  ${!result.success ? '✓' : '✗'} Play result: ${result.success ? 'ERROR - should fail' : `FAILED (correct) - ${result.error}`}`)
}

// Test 8: Invalid card play (wrong suit)
console.log('\nTest 8: Invalid card play (wrong suit)')
const testCard3: Card = { rank: '9', suit: 'hearts', id: 'test-3' }
const cell9Clubs3 = findCell('9', 'clubs')
if (cell9Clubs3) {
  const canPlay = canPlayCard(testCard3, cell9Clubs3.row, cell9Clubs3.col, testBoard)
  console.log(`  Trying to play ${testCard3.rank} of ${testCard3.suit} on 9 of clubs`)
  console.log(`  ${!canPlay ? '✓' : '✗'} Can play: ${canPlay} (expected: false)`)
}

// Test 9: Play on occupied cell
console.log('\nTest 9: Play on occupied cell')
const testCard4: Card = { rank: '9', suit: 'clubs', id: 'test-4' }
const cell9Clubs4 = findCell('9', 'clubs')
if (cell9Clubs4) {
  // First place a chip
  cell9Clubs4.chip = 'red'
  const canPlay = canPlayCard(testCard4, cell9Clubs4.row, cell9Clubs4.col, testBoard)
  console.log(`  Trying to play on occupied cell (has red chip)`)
  console.log(`  ${!canPlay ? '✓' : '✗'} Can play: ${canPlay} (expected: false)`)
  
  const result = playCard(testCard4, cell9Clubs4.row, cell9Clubs4.col, testBoard)
  console.log(`  ${!result.success ? '✓' : '✗'} Play result: ${result.success ? 'ERROR - should fail' : `FAILED (correct) - ${result.error}`}`)
  
  // Clean up
  cell9Clubs4.chip = null
}

// Test 10: Play on joker corner (should fail)
console.log('\nTest 10: Play on joker corner (should fail)')
const testCard5: Card = { rank: '9', suit: 'clubs', id: 'test-5' }
const jokerCorner = testBoard[0][0] // Top-left joker corner
const canPlayJoker = canPlayCard(testCard5, jokerCorner.row, jokerCorner.col, testBoard)
console.log(`  Trying to play on joker corner (0, 0)`)
console.log(`  ${!canPlayJoker ? '✓' : '✗'} Can play: ${canPlayJoker} (expected: false)`)
const resultJoker = playCard(testCard5, jokerCorner.row, jokerCorner.col, testBoard)
console.log(`  ${!resultJoker.success ? '✓' : '✗'} Play result: ${resultJoker.success ? 'ERROR - should fail' : `FAILED (correct) - ${resultJoker.error}`}`)

// Test 11: Out of bounds
console.log('\nTest 11: Out of bounds')
const testCard6: Card = { rank: '9', suit: 'clubs', id: 'test-6' }
const canPlayBounds = canPlayCard(testCard6, -1, 0, testBoard)
console.log(`  Trying to play at (-1, 0) - out of bounds`)
console.log(`  ${!canPlayBounds ? '✓' : '✗'} Can play: ${canPlayBounds} (expected: false)`)
const resultBounds = playCard(testCard6, 15, 15, testBoard)
console.log(`  ${!resultBounds.success ? '✓' : '✗'} Play result: ${resultBounds.success ? 'ERROR - should fail' : `FAILED (correct) - ${resultBounds.error}`}`)

// Test 12: Multiple valid positions for same card
console.log('\nTest 12: Multiple valid positions for same card')
const testCard7: Card = { rank: '9', suit: 'clubs', id: 'test-7' }
let validPositions = 0
for (let row = 0; row < 10; row++) {
  for (let col = 0; col < 10; col++) {
    if (canPlayCard(testCard7, row, col, testBoard)) {
      validPositions++
      const cell = testBoard[row][col]
      console.log(`  Found valid position: (${row}, ${col}) - ${cell.rank} of ${cell.suit}`)
    }
  }
}
console.log(`  ✓ Found ${validPositions} valid positions for 9 of clubs (should be 2, since deck has 2 of each card)`)

// Test 13: Play joker card on regular cell
console.log('\nTest 13: Play joker card on regular cell')
const jokerCard: Card = { rank: 'Joker', suit: 'joker', id: 'test-joker' }
const cell9Clubs5 = findCell('9', 'clubs')
if (cell9Clubs5) {
  const canPlayJoker = canPlayCard(jokerCard, cell9Clubs5.row, cell9Clubs5.col, testBoard)
  console.log(`  Trying to play joker card on 9 of clubs at (${cell9Clubs5.row}, ${cell9Clubs5.col})`)
  console.log(`  ${canPlayJoker ? '✓' : '✗'} Can play joker: ${canPlayJoker} (expected: true)`)
  
  const resultJoker = playCard(jokerCard, cell9Clubs5.row, cell9Clubs5.col, testBoard)
  console.log(`  ${resultJoker.success ? '✓' : '✗'} Play result: ${resultJoker.success ? 'SUCCESS' : `FAILED - ${resultJoker.error}`}`)
}

// Test 14: Play joker card on joker corner (should fail)
console.log('\nTest 14: Play joker card on joker corner (should fail)')
const jokerCard2: Card = { rank: 'Joker', suit: 'joker', id: 'test-joker-2' }
const jokerCorner2 = testBoard[0][0] // Top-left joker corner
const canPlayJokerCorner = canPlayCard(jokerCard2, jokerCorner2.row, jokerCorner2.col, testBoard)
console.log(`  Trying to play joker card on joker corner (0, 0)`)
console.log(`  ${!canPlayJokerCorner ? '✓' : '✗'} Can play: ${canPlayJokerCorner} (expected: false - joker corners can't have chips)`)
const resultJokerCorner = playCard(jokerCard2, jokerCorner2.row, jokerCorner2.col, testBoard)
console.log(`  ${!resultJokerCorner.success ? '✓' : '✗'} Play result: ${resultJokerCorner.success ? 'ERROR - should fail' : `FAILED (correct) - ${resultJokerCorner.error}`}`)

// ==========================================
// SUMMARY
// ==========================================
console.log('\n\n' + '='.repeat(50))
console.log('✅ Test suite complete!')
console.log('='.repeat(50))
console.log('\nReview the results above to verify all tests pass.')
console.log('Note: Some edge cases (like joker cards) may need manual verification\n')

