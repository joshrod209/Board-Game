/**
 * Create simple placeholder joker images using Node.js
 * These are basic placeholders - replace with real joker images when available
 */

const fs = require('fs');
const path = require('path');

const CARDS_DIR = path.join(__dirname, '../public/cards');

// Simple SVG joker template
const jokerSVG = (index) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="200" height="300" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="300" fill="white" stroke="black" stroke-width="2" rx="10"/>
  <text x="100" y="150" font-family="Arial, sans-serif" font-size="60" text-anchor="middle" fill="purple">🃏</text>
  <text x="100" y="180" font-family="Arial, sans-serif" font-size="20" text-anchor="middle" fill="purple" font-weight="bold">JOKER</text>
  <text x="100" y="200" font-family="Arial, sans-serif" font-size="14" text-anchor="middle" fill="gray">${index}</text>
</svg>`;

// Create SVG placeholders
for (let i = 0; i < 4; i++) {
  const svgPath = path.join(CARDS_DIR, `joker_${i}.svg`);
  fs.writeFileSync(svgPath, jokerSVG(i));
  console.log(`✓ Created: joker_${i}.svg`);
}

console.log('\n✅ Created 4 joker SVG placeholders!');
console.log('\n💡 To convert SVG to PNG:');
console.log('   1. Open each SVG in a browser or image editor');
console.log('   2. Export as PNG (200x300px recommended)');
console.log('   3. Save as joker_0.png, joker_1.png, etc.');
console.log('\n   Or use an online converter:');
console.log('   - https://cloudconvert.com/svg-to-png');
console.log('   - https://convertio.co/svg-png/\n');

