/**
 * Script to download joker images from Wikimedia Commons
 * Run with: node scripts/download-jokers.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const CARDS_DIR = path.join(__dirname, '../public/cards');

// Ensure cards directory exists
if (!fs.existsSync(CARDS_DIR)) {
  fs.mkdirSync(CARDS_DIR, { recursive: true });
}

/**
 * Download joker image from a public source
 * Using a direct image URL from Wikimedia Commons or similar
 */
function downloadJoker(index, url, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading: joker_${index}.png from ${url}`);
    
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        const fileStream = fs.createWriteStream(outputPath);
        response.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          console.log(`✓ Saved: joker_${index}.png`);
          resolve();
        });
      } else if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirect
        const redirectUrl = response.headers.location;
        console.log(`Following redirect to: ${redirectUrl}`);
        downloadJoker(index, redirectUrl, outputPath).then(resolve).catch(reject);
      } else {
        console.error(`✗ Failed to download joker_${index}.png (Status: ${response.statusCode})`);
        reject(new Error(`HTTP ${response.statusCode}`));
      }
    }).on('error', (err) => {
      console.error(`✗ Error downloading joker_${index}.png:`, err.message);
      reject(err);
    });
  });
}

/**
 * Main function - downloads joker images
 */
async function main() {
  console.log('🃏 Joker Image Downloader\n');
  
  // Using placeholder URLs - you may need to update these with actual joker image URLs
  // Option 1: Use Wikimedia Commons joker images
  // Option 2: Use a generic joker image and duplicate it
  
  const jokerUrls = [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Playing_card_joker_red.svg/200px-Playing_card_joker_red.svg.png',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Playing_card_joker_red.svg/200px-Playing_card_joker_red.svg.png',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Playing_card_joker_red.svg/200px-Playing_card_joker_red.svg.png',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Playing_card_joker_red.svg/200px-Playing_card_joker_red.svg.png',
  ];
  
  console.log('⚠️  Note: Using placeholder joker images.');
  console.log('   For better variety, you can manually download different joker images.\n');
  
  try {
    const promises = jokerUrls.map((url, index) => {
      const outputPath = path.join(CARDS_DIR, `joker_${index}.png`);
      return downloadJoker(index, url, outputPath);
    });
    
    await Promise.allSettled(promises);
    console.log('\n✅ Joker download complete!');
    console.log(`\n📁 Images saved to: ${CARDS_DIR}\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Alternative: You can manually download joker images from:');
    console.log('   - Wikimedia Commons: https://commons.wikimedia.org/wiki/Category:Playing_cards');
    console.log('   - OpenClipart: https://openclipart.org/');
    console.log('   Save them as: joker_0.png, joker_1.png, joker_2.png, joker_3.png\n');
  }
}

main();

