#!/bin/bash

# Script to help prepare joker images
# This script will check if joker images exist and provide guidance

CARDS_DIR="public/cards"

echo "🃏 Joker Image Preparation Helper"
echo ""

# Check if joker images exist
missing=0
for i in 0 1 2 3; do
    if [ -f "$CARDS_DIR/joker_$i.png" ]; then
        echo "✅ Found: joker_$i.png"
    else
        echo "❌ Missing: joker_$i.png"
        missing=$((missing + 1))
    fi
done

echo ""

if [ $missing -eq 0 ]; then
    echo "🎉 All joker images are present!"
    echo ""
    echo "You can now run the game and the joker cards will display correctly."
else
    echo "⚠️  You need to add $missing joker image(s)."
    echo ""
    echo "📋 Instructions:"
    echo "   1. You have 2 different joker styles"
    echo "   2. Save 2 copies of the first style as: joker_0.png and joker_1.png"
    echo "   3. Save 2 copies of the second style as: joker_2.png and joker_3.png"
    echo "   4. Place all 4 files in: $CARDS_DIR/"
    echo ""
    echo "💡 Tip: If you have the images open, you can:"
    echo "   - Right-click → Save Image As..."
    echo "   - Save with the correct names in the $CARDS_DIR/ directory"
fi

echo ""

