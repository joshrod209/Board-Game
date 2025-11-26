# Quad Sequence Game Rules

## Overview
Quad Sequence is a custom Sequence-style board game played on a 10×10 custom board with a mirrored layout. Players compete to create scores by placing chips on matching card positions.

## Game Board

### Board Layout
- **Size**: 10×10 grid (10 rows × 10 columns)
- **Aspect Ratio**: 10:7 (width:height) - rectangular layout
- **Layout**: Custom card arrangement with mirrored design
- **Equator**: Row 5 (index 4) - cards below this flip orientation
- **Corner Jokers**: 4 corner positions (0,0), (0,9), (9,0), (9,9)

### Board Data
- **File**: `gameCore/boardLayout.ts`
- Contains the complete 10×10 card layout with ranks and suits
- Each cell has: rank, suit, position, joker status, royal belt status

## Scoring Rules

### Score Definition
- **A Score** = 5 consecutive chips in a straight line
- **Directions**: Horizontal, Vertical, Diagonal, Anti-Diagonal
- **Minimum**: Exactly 5 chips (not more, not less for a single score)
- **File**: `gameCore/scoreDetection.ts`

### Score Creation Rules
1. **5 Consecutive Chips**: Must be exactly 5 chips in a row
2. **Joker Wildcards**: Jokers (corner spaces) count as wildcards for ALL teams simultaneously
3. **Capped Chip Limits**: When creating a new score:
   - Maximum 2 capped chips can be used from existing scores
   - If 2 capped chips are used, they must be from 2 different scores (not both from same score)
   - Can use one chip each from two different scores
   - Can steal ONE chip from an existing score to help make a new score

### Score Capping
- Scores must be manually capped (player confirms)
- Once capped, a score is permanent and cannot be removed
- Capped cells are marked and protected
- Cells can belong to multiple scores simultaneously

### Win Condition
- **Goal**: Be the first player to get 4 total capped scores
- **File**: `gameCore/scoreDetection.ts` → `checkWinCondition()`

## Game Rules

### Turn System
- Currently supports 2 players (red and blue)
- Players alternate turns
- Red player starts first

### Chip Placement
- Players place chips by clicking empty cells
- Must match the card in your hand to the board position
- Cannot place on cells that already have chips
- Jokers can be used as wildcards (count for any team)

### Special Rules

#### Joker Actions
- **File**: `gameCore/jokerLogic.ts`
- Jokers allow special actions:
  - **Add**: Place a chip anywhere on the board
  - **Remove**: Remove a chip (cannot remove from capped scores)
- Jokers count as wildcards for score detection

#### Burn Rule
- **File**: `gameCore/burnRule.ts`
- Once per turn, if your card is truly unplayable:
  - Can burn (discard) the card
  - Draw a new card
- Only if the card cannot be played anywhere

#### Card Playing
- **File**: `gameCore/playCard.ts`
- Players have a hand of cards
- Must play a card to place a chip
- Card must match the board position (rank and suit)

## Game Constants

### Configuration Values
**File**: `gameCore/constants.ts`

```typescript
BOARD_SIZE = 10                    // 10×10 grid
NUM_PLAYERS_MIN = 2                // Minimum players
NUM_PLAYERS_MAX = 4                // Maximum players
SCORE_TO_WIN = 4                   // Number of scores needed to win
CHIPS_IN_SCORE = 5                 // Chips needed for one score
CARDS_PER_DECK = 52                // Standard deck size
DECKS_IN_GAME = 2                  // Number of decks used
TOTAL_CARDS = 104                  // Total cards in game
```

## File Organization

### Game Logic (Pure TypeScript)
All in `gameCore/` directory:
- `types.ts` - All TypeScript type definitions
- `constants.ts` - Game constants and configuration
- `boardLayout.ts` - Board layout data structure
- `scoreDetection.ts` - Score detection and validation logic
- `playCard.ts` - Card playing validation and logic
- `jokerLogic.ts` - Joker placement/removal rules
- `burnRule.ts` - Burn rule implementation
- `deck.ts` - Deck creation and management
- `hand.ts` - Player hand management

### UI Components (React)
All in `components/` directory:
- `Board.tsx` - Main game board component
- `Card.tsx` - Individual card display component

### App Structure (Next.js)
All in `app/` directory:
- `layout.tsx` - Root layout
- `page.tsx` - Home page
- `globals.css` - Global styles

## Implementation Status

### ✅ Implemented
- Board layout and display
- Chip placement system
- Turn alternation (red/blue)
- Score detection (5 consecutive chips)
- Joker wildcard logic in score detection
- Score capping
- Win condition checking (4 scores)
- Capped chip validation rules

### 🚧 Placeholder Files (Not Yet Implemented)
- Card playing validation (`playCard.ts`)
- Joker add/remove actions (`jokerLogic.ts`)
- Burn rule (`burnRule.ts`)
- Deck management (`deck.ts`)
- Hand management (`hand.ts`)

## Notes
- Game logic is framework-agnostic (pure TypeScript)
- UI components are React-based
- Designed for easy porting to React Native or native iOS
- Separation of concerns: logic vs. presentation

