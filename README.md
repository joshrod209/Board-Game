# Quad Sequence

A custom board game implementation based on Sequence, featuring a unique 10x10 card layout and strategic gameplay. Built with Next.js, React, TypeScript, and Tailwind CSS.

## 🎮 Game Overview

Quad Sequence is a turn-based strategy game where players compete to create sequences of 5 consecutive chips. The game features:

- **Custom 10x10 Board**: Unique card layout with 4 corner Joker spaces
- **Strategic Scoring**: Create 5 consecutive chips to score (4 chips + 1 joker OR 5 chips)
- **Capped Scores**: Once a score is capped, it becomes permanent and unremovable
- **Advanced Scoring Rules**: 
  - Use up to 2 capped chips from different existing scores
  - Requires 3 uncapped chips when using 2 capped chips
  - Requires 4 uncapped chips when using 1 capped chip
- **Win Condition**: First player to achieve 4 capped scores wins

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/joshrod209/Board-Game.git
cd Board-Game
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI**: React 18

## 📁 Project Structure

```
Board Game/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout component
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
│
├── components/            # React UI components
│   ├── Board.tsx          # Main game board component
│   └── Card.tsx           # Playing card component
│
├── gameCore/              # Game logic (framework-agnostic)
│   ├── types.ts           # TypeScript type definitions
│   ├── constants.ts       # Game constants
│   ├── boardLayout.ts     # Board initialization
│   ├── scoreDetection.ts # Score detection and validation
│   └── ...                # Other game logic modules
│
└── [config files]         # Next.js, TypeScript, Tailwind configs
```

For detailed architecture information, see [STRUCTURE.md](./STRUCTURE.md)

## 📖 Game Rules

For complete game rules and mechanics, see [RULES.md](./RULES.md)

## 🎯 Features

- ✅ Turn-based gameplay with alternating players
- ✅ Real-time score detection
- ✅ Manual score capping system
- ✅ Support for double/triple/quad scores
- ✅ Capped chip reuse with validation
- ✅ Joker corner spaces (wildcards)
- ✅ Win condition detection
- ✅ Game review and new game functionality
- ✅ Alternating starting players between games

## 🧪 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Building for Production

```bash
npm run build
npm run start
```

## 🎨 Future Enhancements

- [ ] Card deck and hand management
- [ ] Multiplayer support (online)
- [ ] iOS native app (React Native)
- [ ] AI opponents
- [ ] Game history and replay

## 📝 License

This project is private and proprietary.

## 👤 Author

Josh Rod

---

Built with ❤️ using Next.js and React

