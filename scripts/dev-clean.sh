#!/bin/bash

# Clean Next.js cache and restart dev server

echo "🛑 Stopping dev server..."
pkill -f "next dev" 2>/dev/null
sleep 1

echo "🧹 Clearing caches..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .turbo

echo "🚀 Starting dev server..."
npm run dev

