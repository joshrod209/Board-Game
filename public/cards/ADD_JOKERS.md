# Adding Your Joker Images

## Instructions

You have 2 different joker styles. We need 4 joker images total (2 of each style).

### Step 1: Save the Images

1. **First Joker Style** (save 2 copies):
   - Save the first joker image as: `joker_0.png`
   - Save the same joker image again as: `joker_1.png`

2. **Second Joker Style** (save 2 copies):
   - Save the second joker image as: `joker_2.png`
   - Save the same joker image again as: `joker_3.png`

### Step 2: Place Files

Place all 4 PNG files in this directory:
```
/Users/substationgrassroots/Board Game/public/cards/
```

### Step 3: Verify

Run this command to verify:
```bash
node scripts/verify-cards.js
```

Or check manually:
- `joker_0.png` ✓
- `joker_1.png` ✓
- `joker_2.png` ✓
- `joker_3.png` ✓

## File Requirements

- **Format**: PNG
- **Size**: Any size (will be automatically scaled)
- **Location**: `/public/cards/` directory
- **Names**: Must be exactly `joker_0.png`, `joker_1.png`, `joker_2.png`, `joker_3.png`

Once you've added these 4 files, the game will automatically use them!

