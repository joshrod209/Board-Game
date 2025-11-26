/**
 * Script to download joker image from a direct URL
 * Usage: node scripts/download-joker-image.js <image-url> <output-filename>
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const CARDS_DIR = path.join(__dirname, '../public/cards');

// Ensure cards directory exists
if (!fs.existsSync(CARDS_DIR)) {
  fs.mkdirSync(CARDS_DIR, { recursive: true });
}

function downloadImage(url, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      
      console.log(`📥 Downloading from: ${url}`);
      console.log(`💾 Saving to: ${outputPath}`);
      
      const fileStream = fs.createWriteStream(outputPath);
      
      client.get(url, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308) {
          const redirectUrl = response.headers.location;
          console.log(`↪️  Redirecting to: ${redirectUrl}`);
          fileStream.close();
          fs.unlinkSync(outputPath); // Remove empty file
          return downloadImage(redirectUrl, outputPath).then(resolve).catch(reject);
        }
        
        if (response.statusCode !== 200) {
          fileStream.close();
          fs.unlinkSync(outputPath);
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }
        
        response.pipe(fileStream);
        
        fileStream.on('finish', () => {
          fileStream.close();
          console.log(`✅ Successfully saved: ${path.basename(outputPath)}`);
          resolve();
        });
      }).on('error', (err) => {
        fileStream.close();
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
}

// Main
const args = process.argv.slice(2);

if (args.length < 1) {
  console.log('❌ Error: Image URL required');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/download-joker-image.js <image-url> [output-filename]');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/download-joker-image.js https://example.com/joker.png joker_0.png');
  console.log('');
  process.exit(1);
}

const imageUrl = args[0];
const outputFilename = args[1] || 'joker_downloaded.png';
const outputPath = path.join(CARDS_DIR, outputFilename);

downloadImage(imageUrl, outputPath)
  .then(() => {
    console.log('');
    console.log('✅ Download complete!');
    console.log(`📁 Image saved to: ${outputPath}`);
    console.log('');
    console.log('💡 Next steps:');
    console.log('   1. Rename the file if needed');
    console.log('   2. Copy it to create joker_0.png and joker_1.png');
    console.log('   3. Add your second joker style as joker_2.png and joker_3.png');
    console.log('');
  })
  .catch((error) => {
    console.error('❌ Error:', error.message);
    console.log('');
    console.log('💡 Alternative:');
    console.log('   1. Right-click the image in your browser');
    console.log('   2. Select "Save Image As..."');
    console.log('   3. Save to:', CARDS_DIR);
    console.log('   4. Name it: joker_0.png');
    console.log('   5. Copy it and rename the copy to joker_1.png');
    console.log('');
    process.exit(1);
  });

