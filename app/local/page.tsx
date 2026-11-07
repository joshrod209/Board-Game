import Link from 'next/link'
import Board from '@/components/Board'

export default function LocalGame() {
  return (
    <main className="min-h-screen p-4 sm:p-8 bg-gray-900">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="text-sm text-gray-400 hover:text-white">← Home</Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-white text-center">Board Game</h1>
          <span className="text-sm text-gray-500">Pass &amp; play</span>
        </div>
        <Board />
      </div>
    </main>
  )
}
