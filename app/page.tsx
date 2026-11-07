'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api, getSavedName, saveName } from '@/lib/socket'
import { CODE_LENGTH, NAME_MAX, type RoomSize } from '@/lib/protocol'

export default function Home() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => setName(getSavedName()), [])

  const trimmedName = name.trim()

  async function create(size: RoomSize) {
    if (!trimmedName) return setError('Enter your name first')
    setBusy(`create-${size}`)
    setError(null)
    saveName(trimmedName)
    const res = await api.create(trimmedName, size)
    if (res.ok && res.code) router.push(`/room/${res.code}`)
    else {
      setError(res.ok ? 'Something went wrong' : res.error)
      setBusy(null)
    }
  }

  function join(e: React.FormEvent) {
    e.preventDefault()
    const clean = code.trim().toUpperCase()
    if (!trimmedName) return setError('Enter your name first')
    if (clean.length !== CODE_LENGTH) return setError(`Game codes are ${CODE_LENGTH} letters`)
    saveName(trimmedName)
    setBusy('join')
    router.push(`/room/${clean}`)
  }

  return (
    <main className="min-h-screen bg-gray-900 px-4 py-10 sm:py-16">
      <div className="max-w-md mx-auto space-y-6">
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-white">Quad Sequence</h1>
          <p className="text-gray-400">Line up 5 chips. Cap 4 scores. Play with friends online.</p>
        </header>

        <section className="bg-gray-800 rounded-xl p-5 space-y-3">
          <label htmlFor="name" className="block text-sm font-semibold text-gray-300">
            Your name
          </label>
          <input
            id="name"
            value={name}
            maxLength={NAME_MAX}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Josh"
            autoComplete="nickname"
            className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </section>

        <section className="bg-gray-800 rounded-xl p-5 space-y-3">
          <h2 className="text-lg font-bold text-white">Start a new game</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => create(2)}
              disabled={busy !== null}
              className="rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-60 px-3 py-3 text-white font-semibold"
            >
              {busy === 'create-2' ? 'Creating…' : '2 players'}
              <span className="block text-xs font-normal text-red-100">1 vs 1</span>
            </button>
            <button
              onClick={() => create(4)}
              disabled={busy !== null}
              className="rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 px-3 py-3 text-white font-semibold"
            >
              {busy === 'create-4' ? 'Creating…' : '4 players'}
              <span className="block text-xs font-normal text-blue-100">2 vs 2 teams</span>
            </button>
          </div>
          <p className="text-xs text-gray-400">You&apos;ll get a code to share with the other players.</p>
        </section>

        <section className="bg-gray-800 rounded-xl p-5 space-y-3">
          <h2 className="text-lg font-bold text-white">Join a game</h2>
          <form onSubmit={join} className="flex gap-2">
            <input
              value={code}
              onChange={e => setCode(e.target.value.replace(/[^a-z]/gi, '').toUpperCase())}
              maxLength={CODE_LENGTH}
              placeholder="CODE"
              aria-label="Game code"
              autoCapitalize="characters"
              className="flex-1 min-w-0 rounded-lg bg-gray-900 border border-gray-700 px-3 py-2.5 text-white text-center text-xl tracking-[0.4em] font-mono placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              type="submit"
              disabled={busy !== null}
              className="rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-60 px-5 text-white font-semibold"
            >
              {busy === 'join' ? 'Joining…' : 'Join'}
            </button>
          </form>
        </section>

        {error && (
          <p role="alert" className="text-center text-sm text-red-300 bg-red-900/40 border border-red-700 rounded-lg p-2">
            {error}
          </p>
        )}

        <p className="text-center text-sm text-gray-400">
          Everyone in one room?{' '}
          <Link href="/local" className="text-blue-400 hover:text-blue-300 underline">
            Pass &amp; play on this device
          </Link>
        </p>
      </div>
    </main>
  )
}
