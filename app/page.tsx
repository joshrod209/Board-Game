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
    <main className="home-bg min-h-screen px-4 py-8 sm:py-14">
      <div className="max-w-md mx-auto space-y-6">
        <header className="text-center">
          <HeroFan />
          <h1 className="mt-8 text-4xl sm:text-5xl font-extrabold tracking-tight text-white drop-shadow">
            Board <span className="text-amber-300">Game</span>
          </h1>
          <p className="mt-2 text-gray-300">Line up 5 chips. Cap 4 scores. Play with friends online.</p>
          <ol className="mt-5 grid grid-cols-3 gap-2 text-xs text-gray-300">
            {['Create a game', 'Share the code', 'Play live'].map((step, i) => (
              <li key={step} className="rounded-lg bg-white/5 border border-white/10 px-2 py-2">
                <span className="block text-amber-300 font-bold">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </header>

        <section className="rounded-2xl bg-gray-900/70 border border-white/10 shadow-2xl backdrop-blur p-5 space-y-5">
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-semibold text-gray-200">
              Your name
            </label>
            <input
              id="name"
              value={name}
              maxLength={NAME_MAX}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Josh"
              autoComplete="nickname"
              className="w-full rounded-xl bg-gray-950/80 border border-white/10 px-4 py-3 text-white text-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-200">Start a new game</h2>
            <div className="grid grid-cols-2 gap-3">
              <ModeButton
                onClick={() => create(2)}
                disabled={busy !== null}
                busy={busy === 'create-2'}
                title="2 players"
                subtitle="1 vs 1"
                chips={['bg-red-600', 'bg-blue-600']}
                className="from-red-700 to-red-600 hover:from-red-600 hover:to-red-500"
              />
              <ModeButton
                onClick={() => create(4)}
                disabled={busy !== null}
                busy={busy === 'create-4'}
                title="4 players"
                subtitle="2 vs 2 teams"
                chips={['bg-red-600', 'bg-blue-600', 'bg-red-600', 'bg-blue-600']}
                className="from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500"
              />
            </div>
            <p className="text-xs text-gray-400">You&apos;ll get a code to share with the other players.</p>
          </div>

          <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-gray-500">
            <span className="h-px flex-1 bg-white/10" />
            or join
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={join} className="flex gap-2">
            <input
              value={code}
              onChange={e => setCode(e.target.value.replace(/[^a-z]/gi, '').toUpperCase())}
              maxLength={CODE_LENGTH}
              placeholder="CODE"
              aria-label="Game code"
              autoCapitalize="characters"
              className="flex-1 min-w-0 rounded-xl bg-gray-950/80 border border-white/10 px-3 py-3 text-white text-center text-2xl tracking-[0.45em] font-mono placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <button
              type="submit"
              disabled={busy !== null}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 px-6 text-white font-bold shadow-lg shadow-emerald-900/40 transition-colors"
            >
              {busy === 'join' ? 'Joining…' : 'Join'}
            </button>
          </form>

          {error && (
            <p role="alert" className="text-center text-sm text-red-200 bg-red-900/50 border border-red-700/60 rounded-lg p-2">
              {error}
            </p>
          )}
        </section>

        <p className="text-center text-sm text-gray-400">
          Everyone in one room?{' '}
          <Link href="/local" className="text-amber-300 hover:text-amber-200 underline underline-offset-2">
            Pass &amp; play on this device
          </Link>
        </p>
      </div>
    </main>
  )
}

/** A hand of real cards fanned above the title */
function HeroFan() {
  const cards = [
    { src: '/cards/spades_A.png', alt: 'Ace of spades' },
    { src: '/cards/hearts_K.png', alt: 'King of hearts' },
    { src: '/cards/Joker_0.png', alt: 'Joker' },
    { src: '/cards/diamonds_J.png', alt: 'Jack of diamonds' },
    { src: '/cards/clubs_A.png', alt: 'Ace of clubs' },
  ]
  return (
    <div className="hero-float flex justify-center pt-4" aria-hidden>
      {cards.map((card, i) => {
        const offset = i - (cards.length - 1) / 2
        return (
          <div
            key={card.src}
            className={`hero-fan-card relative w-14 h-20 sm:w-16 sm:h-[90px] rounded-lg overflow-hidden bg-white ${i ? '-ml-5' : ''}`}
            style={
              {
                '--rot': `${offset * 9}deg`,
                '--arc': `${Math.abs(offset) ** 2 * 4}px`,
                '--delay': `${i * 90}ms`,
                zIndex: i,
              } as React.CSSProperties
            }
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={card.src} alt={card.alt} className="h-full w-full object-cover" draggable={false} />
          </div>
        )
      })}
    </div>
  )
}

function ModeButton({
  onClick,
  disabled,
  busy,
  title,
  subtitle,
  chips,
  className,
}: {
  onClick: () => void
  disabled: boolean
  busy: boolean
  title: string
  subtitle: string
  chips: string[]
  className: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group rounded-xl bg-gradient-to-b ${className} disabled:opacity-60 px-3 py-3.5 text-white shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0`}
    >
      <span className="flex justify-center -space-x-1.5 mb-1.5" aria-hidden>
        {chips.map((chip, i) => (
          <span key={i} className={`h-4 w-4 rounded-full border-2 border-white/90 shadow ${chip}`} />
        ))}
      </span>
      <span className="block font-bold text-base">{busy ? 'Creating…' : title}</span>
      <span className="block text-xs text-white/80">{subtitle}</span>
    </button>
  )
}
