# Project Structure

This document explains the professional organization of the Quad Sequence game codebase.

## 📁 Directory Structure

```
Board Game/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout component
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles (Tailwind)
│
├── components/            # React UI components
│   └── Board.tsx          # Main game board component
│
├── gameCore/              # Game logic (pure, framework-agnostic)
│   ├── types.ts           # Centralized TypeScript type definitions
│   ├── constants.ts       # Game constants and configuration
│   ├── boardLayout.ts     # Board initialization and layout
│   ├── deck.ts            # Deck management logic
│   ├── hand.ts            # Player hand management
│   ├── playCard.ts        # Card playing logic
│   ├── scoreDetection.ts  # Score detection and capping
│   ├── burnRule.ts        # Burn rule implementation
│   └── jokerLogic.ts      # Joker placement/removal logic
│
└── [config files]         # Next.js, TypeScript, Tailwind configs
```

## 🎯 Architecture Principles

### 1. **Separation of Concerns**
- **UI Components** (`components/`) - React components for rendering
- **Game Logic** (`gameCore/`) - Pure business logic, no React dependencies
- This makes it easy to port to React Native or Swift later

### 2. **Type Safety**
- All types centralized in `gameCore/types.ts`
- Import types from a single source of truth
- Makes refactoring easier and prevents type drift

### 3. **Constants Management**
- All game constants in `gameCore/constants.ts`
- Easy to tweak game rules (board size, win conditions, etc.)
- Clear separation between configuration and logic

### 4. **Feature-Based Organization**
- Each game feature has its own file
- Easy to find and modify specific game mechanics
- Clear responsibilities per file

## 🔄 Import Patterns

### Importing Types
```typescript
import type { BoardCell, ChipColor, Card } from '@/gameCore/types'
```

### Importing Constants
```typescript
import { BOARD_SIZE, SCORE_TO_WIN } from '@/gameCore/constants'
```

### Importing Game Logic
```typescript
import { playCard, canPlayCard } from '@/gameCore/playCard'
```

## 🚀 Future Improvements

As the project grows, consider:

1. **Component Organization**
   - `components/Board/` - Board-related components
   - `components/Game/` - Game UI components (hand, deck display)
   - `components/UI/` - Reusable UI components (buttons, modals)

2. **Custom Hooks**
   - `hooks/useGameState.ts` - Game state management
   - `hooks/useBoard.ts` - Board interaction logic

3. **State Management** (if needed)
   - `store/` or `context/` - Global state management
   - Consider Zustand, Redux, or React Context

4. **Utilities**
   - `utils/` - Helper functions, formatters, validators

5. **Tests**
   - `__tests__/` or `*.test.ts` - Unit and integration tests

## 📝 Notes

- All game logic is pure TypeScript (no React)
- UI components are in `components/` using React
- Easy to extract `gameCore/` for use in other platforms
- Follows Next.js 14 App Router conventions

