import Link from 'next/link'
import Board from '@/components/Board'

export default function LocalGame() {
  return (
    <main className="min-h-screen bg-gray-900 px-2 sm:px-4 py-4">
      <div className="w-full max-w-4xl mx-auto space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Link href="/" className="text-sm text-gray-400 hover:text-white">← Home</Link>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Board Game</h1>
          <span className="text-xs sm:text-sm text-gray-400">Pass &amp; play</span>
        </div>
        <Board />
      </div>
    </main>
  )
}
