/**
 * Debug logging, off by default so the game stays fast.
 * Turn on with NEXT_PUBLIC_DEBUG=true in .env.local (then restart the dev server).
 */
const DEBUG = process.env.NEXT_PUBLIC_DEBUG === 'true'

export function debugLog(...args: unknown[]): void {
  if (DEBUG) console.log(...args)
}
