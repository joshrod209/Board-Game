/**
 * Verify all required card images are present
 */

const fs = require('fs');
const path = require('path');

const CARDS_DIR = path.join(__dirname, '../public/cards');

const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

console.log('🔍 Verifying card images...\n');

let missing = [];
let found = 0;

// Check regular cards
for (const suit of suits) {
  for (const rank of ranks) {
    const filename = `${suit}_${rank}.png`;
    const filepath = path.join(CARDS_DIR, filename);
    if (fs.existsSync(filepath)) {
      found++;
    } else {
      missing.push(filename);
    }
  }
}

// Check jokers
for (let i = 0; i < 4; i++) {
  const filename = `joker_${i}.png`;
  const filepath = path.join(CARDS_DIR, filename);
  if (fs.existsSync(filepath)) {
    found++;
  } else {
    missing.push(filename);
  }
}

console.log(`✅ Found: ${found} card images`);
console.log(`❌ Missing: ${missing.length} card images\n`);

if (missing.length > 0) {
  console.log('Missing files:');
  missing.forEach(file => console.log(`   - ${file}`));
  console.log('\n💡 For jokers, you can:');
  console.log('   1. Download from Wikimedia Commons');
  console.log('   2. Use the SVG placeholders and convert to PNG');
  console.log('   3. Create your own joker images\n');
} else {
  console.log('🎉 All card images are present!\n');
}

