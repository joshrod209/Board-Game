/**
 * Page layout shared by pass-and-play and online games. Normally everything
 * stacks. On a phone held sideways (the `lp:` variant) the board sits on the
 * right, filling the screen height, with the scores and hand beside it. If the
 * left column runs long the page scrolls while the board stays put.
 */
export const GAME_PAGE = 'min-h-screen bg-gray-900 px-2 sm:px-4 py-4 lp:px-1 lp:py-1'

export const GAME_LAYOUT =
  'w-full max-w-4xl mx-auto space-y-3 lp:grid lp:max-w-none lp:space-y-0 lp:grid-cols-[minmax(0,1fr)_auto] lp:grid-rows-[auto_auto_1fr] lp:gap-x-2 lp:gap-y-1 lp:items-start'

/** `game-board` (globals.css) sizes it to fit the screen when the phone is sideways */
export const GAME_BOARD =
  'grid gap-0.5 sm:gap-1 p-1.5 sm:p-4 bg-gray-800 rounded-lg lp:col-start-2 lp:row-start-1 lp:row-span-3 lp:sticky lp:top-1 lp:gap-0.5 lp:p-1 game-board'
