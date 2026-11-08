'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api, getPlayerId, getSavedName, getSocket, saveName } from '@/lib/socket'
import { NAME_MAX, type RoomUpdate } from '@/lib/protocol'
import Lobby from './Lobby'
import OnlineGame from './OnlineGame'

type Phase = 'needName' | 'joining' | 'inRoom' | 'error'

export default function OnlineRoom({ code }: { code: string }) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('joining')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [room, setRoom] = useState<RoomUpdate | null>(null)
  const [connected, setConnected] = useState(true)
  const [playerId, setPlayerId] = useState('')

  const join = useCallback(
    async (playerName: string) => {
      setPhase('joining')
      const res = await api.join(code, playerName)
      if (res.ok) {
        setPhase('inRoom')
      } else {
        setError(res.error)
        setPhase('error')
      }
    },
    [code]
  )

  // Connect, listen for updates, and join (or rejoin) the room
  useEffect(() => {
    setPlayerId(getPlayerId())
    const socket = getSocket()
    const onUpdate = (update: RoomUpdate) => {
      if (update.code === code) setRoom(update)
    }
    const onConnect = () => {
      setConnected(true)
      const saved = getSavedName()
      // After a dropped connection, quietly take our seat back
      if (saved) api.join(code, saved)
    }
    const onDisconnect = () => setConnected(false)

    socket.on('room:update', onUpdate)
    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    setConnected(socket.connected)

    const saved = getSavedName()
    if (saved) {
      setName(saved)
      join(saved)
    } else {
      setPhase('needName')
    }

    return () => {
      socket.off('room:update', onUpdate)
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
    }
  }, [code, join])

  function submitName(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    saveName(trimmed)
    join(trimmed)
  }

  function leave() {
    api.leave()
    router.push('/')
  }

  const banner = !connected && (
    <div className="fixed top-0 inset-x-0 z-50 bg-yellow-600 text-yellow-50 text-center text-sm pb-1.5 safe-top-pad">
      Connection lost. Reconnecting…
    </div>
  )

  if (phase === 'needName') {
    return (
      <Shell>
        <form onSubmit={submitName} className="bg-gray-800 rounded-xl p-5 space-y-3 max-w-sm mx-auto">
          <h2 className="text-lg font-bold text-white">Join game {code}</h2>
          <label htmlFor="join-name" className="block text-sm text-gray-300">Your name</label>
          <input
            id="join-name"
            autoFocus
            value={name}
            maxLength={NAME_MAX}
            onChange={e => setName(e.target.value)}
            className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" className="w-full rounded-lg bg-green-600 hover:bg-green-500 py-2.5 text-white font-semibold">
            Join
          </button>
        </form>
      </Shell>
    )
  }

  if (phase === 'error') {
    return (
      <Shell>
        <div className="bg-gray-800 rounded-xl p-6 text-center space-y-4 max-w-sm mx-auto">
          <p className="text-red-300">{error}</p>
          <Link href="/" className="inline-block rounded-lg bg-blue-600 hover:bg-blue-500 px-5 py-2 text-white font-semibold">
            Back to home
          </Link>
        </div>
      </Shell>
    )
  }

  if (!room) {
    return (
      <Shell>
        {banner}
        <p className="text-center text-gray-400">Joining game {code}…</p>
      </Shell>
    )
  }

  if (room.started && room.game) {
    return (
      <>
        {banner}
        <OnlineGame room={room} game={room.game} onLeave={leave} />
      </>
    )
  }

  return (
    <Shell>
      {banner}
      <Lobby room={room} playerId={playerId} onLeave={leave} />
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gray-900 px-4 py-8">
      <div className="max-w-xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-white text-center">
          <Link href="/">Board Game</Link>
        </h1>
        {children}
      </div>
    </main>
  )
}
