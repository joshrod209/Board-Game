import Link from 'next/link'
import Board from '@/components/Board'
import { GAME_LAYOUT, GAME_PAGE } from '@/components/gameLayout'

export default function LocalGame() {
  return (
    <main className={GAME_PAGE}>
      <div className={GAME_LAYOUT}>
        <div className="flex items-center justify-between gap-2">
          <Link href="/" className="rounded-full px-2.5 py-0.5 text-sm text-gray-400 hover:bg-white/5 hover:text-white">
            ← Home
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-white lp:hidden">Board Game</h1>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] sm:text-xs font-medium text-gray-300">
            Pass &amp; play
          </span>
        </div>
        <Board />
      </div>
    </main>
  )
}
