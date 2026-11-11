'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/socket'
import type { LobbyPlayer, RoomUpdate } from '@/lib/protocol'
import type { Team } from '@/gameCore/engine'

const TEAM_STYLE: Record<Team, { label: string; box: string; text: string; button: string }> = {
  red: {
    label: 'Red team',
    box: 'border-red-600/60 bg-red-950/30',
    text: 'text-red-400',
    button: 'bg-red-600 hover:bg-red-500',
  },
  blue: {
    label: 'Blue team',
    box: 'border-blue-600/60 bg-blue-950/30',
    text: 'text-blue-400',
    button: 'bg-blue-600 hover:bg-blue-500',
  },
}

export default function Lobby({ room, playerId, onLeave }: { room: RoomUpdate; playerId: string; onLeave: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [link, setLink] = useState('')
  // Phones (and some browsers) can hand the invite to Messages and other apps
  const [canShare, setCanShare] = useState(false)

  useEffect(() => {
    setLink(`${window.location.origin}/room/${room.code}`)
    setCanShare(typeof navigator.share === 'function')
  }, [room.code])

  const isHost = room.hostId === playerId
  const me = room.players.find(p => p.id === playerId)
  const perTeam = room.size / 2
  const missing = room.size - room.players.length

  async function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null)
    const res = await action()
    if (!res.ok) setError(res.error ?? 'Something went wrong')
  }

  /** Open the share sheet with a short message; Messages shows the link's preview card */
  async function shareInvite() {
    const from = me?.name ? `${me.name} invited you` : "You're invited"
    try {
      await navigator.share({ title: 'Board Game', text: `${from} to play The Board Game! Game code ${room.code}`, url: link })
    } catch (e) {
      // Closing the share sheet isn't an error; anything else falls back to copying
      if ((e as Error)?.name !== 'AbortError') copyLink()
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard needs https; the link is still shown to copy by hand
      setError('Copy the link below by hand')
    }
  }

  return (
    <div className="space-y-5">
      <section className="bg-gray-800 rounded-xl p-5 text-center space-y-2">
        <p className="text-sm text-gray-400">Game code</p>
        <p className="text-5xl font-mono font-bold tracking-[0.3em] text-white pl-[0.3em]">{room.code}</p>
        <p className="text-sm text-gray-400">
          {room.size === 2 ? '2 players · 1 vs 1' : '4 players · 2 vs 2, turns alternate teams'}
        </p>
        <div className="flex items-center gap-2 pt-2">
          <input
            readOnly
            value={link}
            aria-label="Invite link"
            onFocus={e => e.target.select()}
            className="flex-1 min-w-0 rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-xs text-gray-300"
          />
          {canShare && (
            <button onClick={shareInvite} className="rounded-lg bg-yellow-500 hover:bg-yellow-400 px-3 py-2 text-sm font-semibold text-gray-900">
              Share invite
            </button>
          )}
          <button onClick={copyLink} className="rounded-lg bg-gray-700 hover:bg-gray-600 px-3 py-2 text-sm text-white">
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(['red', 'blue'] as Team[]).map(team => {
          const members = room.players.filter(p => p.team === team)
          const style = TEAM_STYLE[team]
          const canSwitch = me && me.team !== team && members.length < perTeam
          return (
            <div key={team} className={`rounded-xl border-2 p-4 space-y-2 ${style.box}`}>
              <h3 className={`font-bold ${style.text}`}>
                {style.label} <span className="text-gray-400 font-normal text-sm">({members.length}/{perTeam})</span>
              </h3>
              <ul className="space-y-1.5">
                {members.map(p => (
                  <PlayerRow key={p.id} player={p} isYou={p.id === playerId} isHost={p.id === room.hostId} />
                ))}
                {Array.from({ length: perTeam - members.length }).map((_, i) => (
                  <li key={`open-${i}`} className="rounded-lg border border-dashed border-gray-600 px-3 py-2 text-sm text-gray-500">
                    Open seat
                  </li>
                ))}
              </ul>
              {canSwitch && (
                <button
                  onClick={() => run(() => api.setTeam(team))}
                  className={`w-full rounded-lg ${style.button} py-1.5 text-sm text-white font-semibold`}
                >
                  Switch to {team}
                </button>
              )}
            </div>
          )
        })}
      </section>

      <section className="space-y-2">
        {isHost ? (
          <button
            onClick={() => run(api.start)}
            disabled={missing > 0}
            className="w-full rounded-xl bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-400 py-3 text-lg text-white font-bold"
          >
            {missing > 0 ? `Waiting for ${missing} more player${missing === 1 ? '' : 's'}…` : 'Start game'}
          </button>
        ) : (
          <p className="text-center text-gray-400">
            {missing > 0
              ? `Waiting for ${missing} more player${missing === 1 ? '' : 's'}…`
              : `Waiting for ${room.players.find(p => p.id === room.hostId)?.name ?? 'the host'} to start…`}
          </p>
        )}
        {error && <p role="alert" className="text-center text-sm text-red-300">{error}</p>}
        <button onClick={onLeave} className="w-full text-sm text-gray-400 hover:text-white py-1">
          Leave game
        </button>
      </section>
    </div>
  )
}

function PlayerRow({ player, isYou, isHost }: { player: LobbyPlayer; isYou: boolean; isHost: boolean }) {
  return (
    <li className="flex items-center gap-2 rounded-lg bg-gray-900/60 px-3 py-2 text-sm text-white">
      <span className={`h-2 w-2 rounded-full ${player.connected ? 'bg-green-400' : 'bg-gray-500'}`} aria-hidden />
      <span className="truncate">{player.name}</span>
      {isYou && <span className="text-xs text-gray-400">(you)</span>}
      {isHost && <span className="ml-auto text-xs text-yellow-400">host</span>}
    </li>
  )
}
