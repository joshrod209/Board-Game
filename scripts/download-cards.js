/**
 * Script to download playing card images from deckofcardsapi.com
 * Run with: node scripts/download-cards.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const CARDS_DIR = path.join(__dirname, '../public/cards');

// Ensure cards directory exists
if (!fs.existsSync(CARDS_DIR)) {
  fs.mkdirSync(CARDS_DIR, { recursive: true });
}

// Card mapping: our format -> deckofcardsapi format
const suits = {
  'hearts': 'HEARTS',
  'diamonds': 'DIAMONDS',
  'clubs': 'CLUBS',
  'spades': 'SPADES'
};

const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

/**
 * Download a single card image
 */
function downloadCard(suit, rank, outputPath) {
  return new Promise((resolve, reject) => {
    // deckofcardsapi.com format: https://deckofcardsapi.com/static/img/{rank}{suit}.png
    // Example: https://deckofcardsapi.com/static/img/AS.png (Ace of Spades)
    const apiRank = rank === '10' ? '0' : rank; // API uses '0' for 10
    const apiSuit = suit.charAt(0).toUpperCase(); // First letter: H, D, C, S
    const url = `https://deckofcardsapi.com/static/img/${apiRank}${apiSuit}.png`;
    
    console.log(`Downloading: ${suit}_${rank}.png from ${url}`);
    
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        const fileStream = fs.createWriteStream(outputPath);
        response.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          console.log(`✓ Saved: ${path.basename(outputPath)}`);
          resolve();
        });
      } else {
        console.error(`✗ Failed to download ${suit}_${rank}.png (Status: ${response.statusCode})`);
        reject(new Error(`HTTP ${response.statusCode}`));
      }
    }).on('error', (err) => {
      console.error(`✗ Error downloading ${suit}_${rank}.png:`, err.message);
      reject(err);
    });
  });
}

/**
 * Download all regular cards
 */
async function downloadRegularCards() {
  console.log('\n📥 Downloading regular cards (52 cards)...\n');
  
  const promises = [];
  for (const [suit, apiSuit] of Object.entries(suits)) {
    for (const rank of ranks) {
      const outputPath = path.join(CARDS_DIR, `${suit}_${rank}.png`);
      promises.push(downloadCard(suit, rank, outputPath));
    }
  }
  
  await Promise.allSettled(promises);
  console.log('\n✓ Regular cards download complete!\n');
}

/**
 * Download joker images (we'll need to create placeholder or find source)
 */
async function downloadJokers() {
  console.log('📥 Downloading jokers...\n');
  
  // deckofcardsapi.com doesn't have jokers, so we'll create a note
  // You can manually add joker images or use a different source
  console.log('⚠️  Note: deckofcardsapi.com does not provide joker images.');
  console.log('   You can:');
  console.log('   1. Download joker images from Wikimedia Commons');
  console.log('   2. Create your own joker images');
  console.log('   3. Use placeholder images');
  console.log('   Save them as: joker_0.png, joker_1.png, joker_2.png, joker_3.png\n');
  
  // Create placeholder files to show what's needed
  for (let i = 0; i < 4; i++) {
    const placeholderPath = path.join(CARDS_DIR, `joker_${i}.png.placeholder`);
    fs.writeFileSync(placeholderPath, `Placeholder for joker_${i}.png\nReplace this file with an actual joker image.`);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🎴 Playing Card Image Downloader\n');
  console.log('This script downloads card images from deckofcardsapi.com\n');
  
  try {
    await downloadRegularCards();
    await downloadJokers();
    
    console.log('✅ Download complete!');
    console.log(`\n📁 Images saved to: ${CARDS_DIR}`);
    console.log('\n⚠️  Remember to:');
    console.log('   1. Add joker images manually (joker_0.png through joker_3.png)');
    console.log('   2. Verify all card images downloaded correctly');
    console.log('   3. Check that jack images show correct eye types:');
    console.log('      - Two-eyed: diamonds_J.png, clubs_J.png');
    console.log('      - One-eyed: hearts_J.png, spades_J.png\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
main();

