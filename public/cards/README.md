# Playing Card Images

This directory should contain images of standard playing cards.

## Required Images

### Regular Cards (52 cards)
- Format: `{suit}_{rank}.png`
- Suits: `hearts`, `diamonds`, `clubs`, `spades`
- Ranks: `2`, `3`, `4`, `5`, `6`, `7`, `8`, `9`, `10`, `J`, `Q`, `K`, `A`

Examples:
- `hearts_A.png` - Ace of Hearts
- `spades_J.png` - Jack of Spades (one-eyed)
- `diamonds_J.png` - Jack of Diamonds (two-eyed)
- `clubs_J.png` - Jack of Clubs (two-eyed)
- `hearts_J.png` - Jack of Hearts (one-eyed)

### Jokers (4 cards)
- Format: `joker_{index}.png`
- Files: `joker_0.png`, `joker_1.png`, `joker_2.png`, `joker_3.png`

### Card Back (optional)
- `card_back.png` - Back of card (used as fallback)

## Image Sources

You can get playing card images from:

1. **Free Sources:**
   - [OpenClipart](https://openclipart.org/) - Search for "playing cards"
   - [Wikimedia Commons](https://commons.wikimedia.org/wiki/Category:Playing_cards) - Public domain card images
   - [SVG Playing Cards](https://github.com/htdebeer/SVG-cards) - SVG card library

2. **Card Image Libraries:**
   - [deck.of.cards API](https://deckofcardsapi.com/) - Free API with card images
   - [Playing Cards.io](https://playingcards.io/) - Card image resources

3. **Create Your Own:**
   - Use a card design tool
   - Export from card game software
   - Scan/photograph real cards

## Image Specifications

- **Format:** PNG (with transparency preferred)
- **Size:** Recommended 200x300px or larger (will be scaled down)
- **Aspect Ratio:** ~2:3 (standard playing card ratio)
- **Background:** Transparent or white

## Important Notes

- **Jack Types:** Make sure your jack images correctly show:
  - **Two-eyed jacks** (Diamonds/Clubs): Face forward, both eyes visible
  - **One-eyed jacks** (Hearts/Spades): Profile view, one eye visible

- The code will automatically use the correct image based on the card's suit and rank
- If an image is missing, the component will fall back to a styled text version

## Quick Setup

1. Download or create card images
2. Name them according to the format above
3. Place all images in this `/public/cards/` directory
4. The game will automatically use them!

