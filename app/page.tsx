import Board from '@/components/Board'

export default function Home() {
  return (
    <main className="min-h-screen p-8 bg-gray-900">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">
          Quad Sequence
        </h1>
        <Board />
      </div>
    </main>
  )
}

