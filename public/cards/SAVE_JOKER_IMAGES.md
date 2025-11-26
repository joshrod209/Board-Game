# How to Save Joker Images

## Option 1: Download from Browser (Recommended)

Since the image is from iStock (paid), you'll need to download it manually:

1. **Open the image in your browser**
   - Right-click on the joker image
   - Select "Save Image As..." or "Copy Image"

2. **Save the first joker style** (you'll need 2 copies):
   - Save as: `joker_0.png`
   - Save again as: `joker_1.png`
   - Location: This folder (`/Users/substationgrassroots/Board Game/public/cards/`)

3. **Save the second joker style** (you'll need 2 copies):
   - Save as: `joker_2.png`
   - Save again as: `joker_3.png`
   - Location: Same folder

## Option 2: Use the Download Script

If you have a direct image URL (not a Google/iStock redirect):

```bash
node scripts/download-joker-image.js <direct-image-url> joker_0.png
```

## Quick Steps

1. **Find the actual image URL:**
   - Open the Google Images link
   - Click "View Image" or right-click → "Copy Image Address"
   - This gives you the direct image URL

2. **Download both joker styles:**
   - Style 1 → `joker_0.png` and `joker_1.png`
   - Style 2 → `joker_2.png` and `joker_3.png`

3. **Verify:**
   ```bash
   node scripts/verify-cards.js
   ```

## Note About iStock

If the image is from iStock, you may need to:
- Purchase/download it from iStock if you want to use it commercially
- Or find a free alternative from:
  - [Wikimedia Commons](https://commons.wikimedia.org/wiki/Category:Playing_cards)
  - [OpenClipart](https://openclipart.org/)
  - Other free image sources

