# Joker Image Setup Guide

## ✅ Status
- ✅ All 52 regular cards downloaded successfully
- ⚠️  Need to add 4 joker images

## Quick Setup Options

### Option 1: Use SVG Placeholders (Easiest)
1. SVG placeholders have been created: `joker_0.svg` through `joker_3.svg`
2. Convert them to PNG:
   - **Online**: Go to https://cloudconvert.com/svg-to-png
   - Upload each SVG file
   - Set size to 200x300px
   - Download as PNG
   - Rename to `joker_0.png`, `joker_1.png`, etc.
   - Place in `/public/cards/` directory

### Option 2: Download from Wikimedia Commons
1. Visit: https://commons.wikimedia.org/wiki/Category:Playing_cards
2. Search for "joker" or "playing card joker"
3. Download 4 different joker images
4. Resize to ~200x300px if needed
5. Save as `joker_0.png`, `joker_1.png`, `joker_2.png`, `joker_3.png`
6. Place in `/public/cards/` directory

### Option 3: Use Image Search
1. Search Google Images for "playing card joker" (filter for free use)
2. Download 4 different joker images
3. Resize to ~200x300px
4. Save with correct names in `/public/cards/` directory

### Option 4: Create Your Own
- Use any image editor
- Create 200x300px images
- Design joker cards
- Save as PNG files

## Verify Setup
Run this command to check:
```bash
node scripts/verify-cards.js
```

Once all 56 images (52 cards + 4 jokers) are present, the game will automatically use them!

## File Requirements
- **Format**: PNG
- **Size**: ~200x300px (will be scaled automatically)
- **Names**: `joker_0.png`, `joker_1.png`, `joker_2.png`, `joker_3.png`
- **Location**: `/public/cards/` directory

