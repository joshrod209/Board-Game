'use client'

import { SCORE_TO_WIN } from '@/gameCore/constants'

type Team = 'red' | 'blue'

export type TeamMember = {
  id: string
  name: string
  isTurn: boolean
  isYou?: boolean
  online?: boolean
}

export type TeamInfo = {
  score: number
  active: boolean
  won: boolean
  /** Online games list the players on each team */
  members?: TeamMember[]
}

type ScoreboardProps = {
  red: TeamInfo
  blue: TeamInfo
  /** Big line in the middle, e.g. "Red's turn" or "Your turn!" */
  status: string
  /** Color of the status line */
  statusTone: Team | 'win' | 'you'
  /** Latest move, shown under the status */
  lastEvent: string | null
}

/**
 * Shared by online and pass-and-play: a panel for each team on the sides
 * (score with progress dots; the team whose turn it is glows) and whose
 * turn it is in the middle.
 */
export default function Scoreboard({ red, blue, status, statusTone, lastEvent }: ScoreboardProps) {
  const toneClass = {
    red: 'text-red-400',
    blue: 'text-blue-400',
    win: 'text-yellow-300',
    you: 'text-yellow-300',
  }[statusTone]

  return (
    <section className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2 sm:gap-3" aria-label="Scoreboard">
      <TeamPanel team="red" {...red} />
      <div className="flex min-w-0 max-w-[11rem] sm:max-w-xs flex-col items-center justify-center px-1 text-center">
        <div className={`text-base sm:text-xl font-extrabold leading-tight ${toneClass}`}>{status}</div>
        <div className="mt-0.5 h-4 w-full truncate text-[11px] sm:text-xs text-gray-400">{lastEvent ?? ''}</div>
      </div>
      <TeamPanel team="blue" {...blue} />
    </section>
  )
}

function TeamPanel({ team, score, active, won, members }: TeamInfo & { team: Team }) {
  const isRed = team === 'red'
  const name = isRed ? 'Red' : 'Blue'
  return (
    <div
      className={`flex items-center gap-2 sm:gap-3 rounded-xl border px-2.5 py-2 sm:px-4 sm:py-3 transition-colors ${
        isRed ? 'flex-row' : 'flex-row-reverse text-right'
      } ${
        won
          ? 'border-yellow-400 bg-yellow-400/10'
          : active
            ? isRed
              ? 'border-red-500/70 bg-red-500/10 shadow-[0_0_18px_rgba(239,68,68,0.25)]'
              : 'border-blue-500/70 bg-blue-500/10 shadow-[0_0_18px_rgba(59,130,246,0.25)]'
            : 'border-white/5 bg-gray-800'
      }`}
      aria-label={`${name}: ${score} of ${SCORE_TO_WIN} scores${active ? ', their turn' : ''}`}
    >
      <span
        className={`hidden sm:block h-8 w-8 shrink-0 rounded-full border-2 border-white/90 shadow ${isRed ? 'bg-red-600' : 'bg-blue-600'}`}
        aria-hidden
      />
      <div className="min-w-0">
        <div className={`flex items-center gap-1.5 text-xs sm:text-sm font-semibold ${isRed ? 'text-red-300' : 'text-blue-300 justify-end'}`}>
          {name}
          {active && (
            <span className="rounded-full bg-white/10 px-1.5 py-px text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-white">
              Turn
            </span>
          )}
        </div>
        <div className={`flex items-baseline gap-1.5 ${isRed ? '' : 'justify-end'}`}>
          <span className={`text-2xl sm:text-3xl font-extrabold leading-none ${isRed ? 'text-red-500' : 'text-blue-500'}`}>{score}</span>
          <span className="text-xs text-gray-500">/ {SCORE_TO_WIN}</span>
        </div>
        <div className={`mt-1 flex gap-1 ${isRed ? '' : 'justify-end'}`} aria-hidden>
          {Array.from({ length: SCORE_TO_WIN }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-3 sm:w-4 rounded-full ${i < score ? (isRed ? 'bg-red-500' : 'bg-blue-500') : 'bg-white/10'}`}
            />
          ))}
        </div>
        {members && members.length > 0 && (
          <ul className={`mt-1 flex flex-wrap gap-x-2 text-[10px] sm:text-xs ${isRed ? '' : 'justify-end'}`}>
            {members.map(m => (
              <li
                key={m.id}
                className={`max-w-[6.5rem] truncate ${m.isTurn ? 'font-bold text-white' : 'text-gray-400'} ${m.online === false ? 'opacity-50' : ''}`}
                title={`${m.name}${m.isYou ? ' (you)' : ''}${m.online === false ? ' (offline)' : ''}`}
              >
                {m.isTurn ? '▸ ' : ''}
                {m.name}
                {m.isYou ? ' (you)' : ''}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
