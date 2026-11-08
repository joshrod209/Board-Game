'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Card } from '@/gameCore/types'
import { BOARD_SIZE } from '@/gameCore/constants'
import { type CellPos, type PlayerView, type Team, checkCapCell, hasScoresToCap, permanentCapperMap } from '@/gameCore/engine'
import type { GameAction, RoomUpdate } from '@/lib/protocol'
import { api } from '@/lib/socket'
import BoardCell from '../BoardCell'
import HandComponent from '../Hand'
import PileStrip from '../PileStrip'
import Scoreboard from '../Scoreboard'
import { GAME_LAYOUT, GAME_BOARD, GAME_PAGE } from '../gameLayout'

const TEAM_DOT: Record<Team, string> = { red: 'bg-red-600', blue: 'bg-blue-600' }

type Props = { room: RoomUpdate; game: PlayerView; onLeave: () => void }

export default function OnlineGame({ room, game, onLeave }: Props) {
  const me = game.seats.find(s => s.id === game.you)!
  const myTeam = me.team
  // Seating around a real table: R1 and B1 share one side, R2 and B2 the
  // other (in 2 players, R1 and B1 sit opposite). Players on the far side
  // see the board turned around so their half of the board faces them.
  const mySeat = game.seats.findIndex(s => s.id === game.you)
  const farSide = game.seats.length === 4 ? mySeat >= 2 : mySeat === 1
  const current = game.seats.find(s => s.id === game.currentPlayerId)!
  const myTurn = game.currentPlayerId === game.you && !game.winner

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [jokerAction, setJokerAction] = useState<'add' | 'remove' | null>(null)
  const [capMode, setCapMode] = useState(false)
  const [capSelection, setCapSelection] = useState<CellPos[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [winnerDismissed, setWinnerDismissed] = useState(false)
  const justCapped = useRef(false)

  const selectedCard = game.hand.find(c => c.id === selectedCardId) ?? null
  const connectedById = useMemo(() => new Map(room.players.map(p => [p.id, p.connected])), [room.players])

  // Drop a selection whose card left the hand (played, burned, or new deal)
  useEffect(() => {
    if (selectedCardId && !game.hand.some(c => c.id === selectedCardId)) {
      setSelectedCardId(null)
      setJokerAction(null)
    }
  }, [game.hand, selectedCardId])

  // After capping, stay in cap mode only while more scores are waiting
  useEffect(() => {
    if (justCapped.current) {
      justCapped.current = false
      if (!hasScoresToCap(game.board, game.cappedScores, myTeam)) setCapMode(false)
    }
  }, [game.board, game.cappedScores, myTeam])

  useEffect(() => {
    if (!game.winner) setWinnerDismissed(false)
    else setCapMode(false)
  }, [game.winner])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const send = useCallback(async (action: GameAction) => {
    setPending(true)
    const res = await api.act(action)
    setPending(false)
    if (!res.ok) setToast(res.error)
    return res.ok
  }, [])

  const permanentCappers = useMemo(
    () => permanentCapperMap(game.board, game.cappedScores),
    [game.board, game.cappedScores]
  )

  const scores = useMemo(() => {
    const count = (team: Team) => game.cappedScores.filter(s => s.color === team && s.isCapped).length
    return { red: count('red'), blue: count('blue') }
  }, [game.cappedScores])

  const handleCellClick = (row: number, col: number) => {
    if (pending) return
    if (capMode) {
      if (capSelection.some(c => c.row === row && c.col === col)) {
        setCapSelection(sel => sel.filter(c => !(c.row === row && c.col === col)))
        return
      }
      const error = checkCapCell(game.board, game.cappedScores, myTeam, capSelection, row, col)
      if (error) return setToast(error)
      const next = [...capSelection, { row, col }]
      setCapSelection(next)
      if (next.length === 5) {
        send({ type: 'cap', cells: next }).then(ok => {
          setCapSelection([])
          if (ok) justCapped.current = true
        })
      }
      return
    }

    if (game.winner) return
    if (!myTurn) return setToast(`It's ${current.name}'s turn`)
    if (!selectedCard) return setToast('Pick a card from your hand first')
    if (selectedCard.wildCardType === 'joker' && !jokerAction) return setToast('Choose Add or Remove for the Joker first')
    send({
      type: 'play',
      cardId: selectedCard.id,
      row,
      col,
      jokerAction: selectedCard.wildCardType === 'joker' ? jokerAction ?? undefined : undefined,
    }).then(ok => {
      if (ok) {
        setSelectedCardId(null)
        setJokerAction(null)
      }
    })
  }

  const handleCardSelect = (card: Card) => {
    setJokerAction(null)
    setSelectedCardId(id => (id === card.id ? null : card.id))
  }

  // Stable handlers for the memoized squares and cards
  const latest = useRef({ handleCellClick, handleCardSelect })
  useLayoutEffect(() => {
    latest.current = { handleCellClick, handleCardSelect }
  })
  const onCellClick = useCallback((row: number, col: number) => latest.current.handleCellClick(row, col), [])
  const onCardSelect = useCallback((card: Card) => latest.current.handleCardSelect(card), [])

  const toggleCapMode = () => {
    setCapSelection([])
    setCapMode(on => !on)
    setSelectedCardId(null)
    setJokerAction(null)
  }

  const allHandsEmpty = game.seats.every(s => s.cardCount === 0)
  const canReshuffle = !game.winner && (game.deckCount === 0 || allHandsEmpty)
  // Burn is the player's call: the button is there on your turn; the server checks the card is dead
  const canBurn = myTurn && game.deckCount > 0
  const winnerTeam = game.winner

  const teamInfo = (team: Team) => ({
    score: scores[team],
    active: current.team === team && !winnerTeam,
    won: winnerTeam === team,
    members: game.seats
      .filter(seat => seat.team === team)
      .map(seat => ({
        id: seat.id,
        name: seat.name,
        isTurn: seat.id === game.currentPlayerId && !winnerTeam,
        isYou: seat.id === game.you,
        online: connectedById.get(seat.id) ?? false,
      })),
  })

  // "Cap a score" lives in the hand box's action row (more room for the board)
  const capButton = (
    <button
      onClick={toggleCapMode}
      disabled={!!game.winner}
      className={`flex items-center gap-1.5 rounded px-3 py-1 text-xs font-semibold text-white transition-colors disabled:opacity-50 ${
        capMode ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-gray-700 hover:bg-gray-600'
      }`}
      title="Cap a score: pick 5 squares in a line. You can cap on anyone's turn."
    >
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white">
        <span className={`h-2 w-2 rounded-full ${TEAM_DOT[myTeam]}`} />
      </span>
      {capMode ? 'Cancel capping' : 'Cap a score'}
    </button>
  )

  const capNotice = capMode ? (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-yellow-500/60 bg-yellow-900/40 px-2 py-1.5">
      <span className="text-xs font-semibold text-yellow-200">
        Capping for {myTeam === 'red' ? 'Red' : 'Blue'}: select 5 squares in a line ({capSelection.length}/5). You can cap on anyone&apos;s turn.
      </span>
      {capSelection.length > 0 && (
        <button
          onClick={() => setCapSelection([])}
          className="rounded bg-red-600 px-2 py-0.5 text-xs text-white hover:bg-red-700"
        >
          Clear selection
        </button>
      )}
    </div>
  ) : null

  return (
    <main className={GAME_PAGE}>
      <div className={GAME_LAYOUT}>
        {/* Header (matches pass-and-play) */}
        <div className="flex items-center justify-between gap-2">
          <button onClick={onLeave} className="rounded-full px-2.5 py-0.5 text-sm text-gray-400 hover:bg-white/5 hover:text-white">
            ← Leave
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-white lp:hidden">Board Game</h1>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 font-mono text-[11px] sm:text-xs font-medium text-gray-300">
            Code {room.code}
          </span>
        </div>

        {/* Scoreboard (shared with pass-and-play), with each team's players */}
        <Scoreboard
          red={teamInfo('red')}
          blue={teamInfo('blue')}
          status={winnerTeam ? `${winnerTeam === 'red' ? 'Red' : 'Blue'} wins!` : myTurn ? 'Your turn!' : `${current.name}'s turn`}
          statusTone={winnerTeam ? 'win' : myTurn ? 'you' : current.team}
          lastEvent={game.lastEvent}
        />

        {/* Your hand, with the deck and discard pile tucked into its bottom row */}
        <HandComponent
          hand={{ cards: game.hand }}
          title={`Your hand · ${myTeam} team`}
          selectedCardId={selectedCardId}
          onCardSelect={onCardSelect}
          onBurnCard={() => selectedCard && send({ type: 'burn', cardId: selectedCard.id })}
          onJokerActionSelect={setJokerAction}
          disabled={capMode || !!game.winner}
          playerColor={myTeam}
          canBurn={canBurn}
          hasBurned={myTurn && game.hasBurnedThisTurn}
          selectedCard={selectedCard}
          jokerActionMode={jokerAction}
          canPass={myTurn && game.canPass}
          onPass={() => send({ type: 'pass' })}
          orderKey={`${room.code}:${game.you}`}
          persistOrder
          actions={capButton}
          notice={capNotice}
          pile={
            <PileStrip
              players={game.seats}
              discardPile={game.discardPile}
              deckCount={game.deckCount}
              showShuffle={canReshuffle}
              onShuffle={() => send({ type: 'shuffle' })}
            />
          }
        />

        {/* Board */}
        <div
          className={`${GAME_BOARD} ${!game.winner && !capMode ? (current.team === 'red' ? 'ring-2 ring-red-500/60' : 'ring-2 ring-blue-500/60') : ''} ${farSide ? 'rotate-180' : ''}`}
          data-far-side={farSide}
          style={{
            gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
            aspectRatio: '10 / 7',
          }}
        >
          {game.board.map((row, r) =>
            row.map((cell, c) => (
              <BoardCell
                key={`${r}-${c}`}
                row={r}
                col={c}
                cell={cell}
                capperColor={permanentCappers.get(`${r},${c}`) ?? null}
                tempCapColor={capMode && capSelection.some(p => p.row === r && p.col === c) ? myTeam : null}
                onCellClick={onCellClick}
                highlight={game.lastMove?.row === r && game.lastMove?.col === c}
              />
            ))
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className="fixed safe-bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-[90vw] rounded-lg bg-gray-950/95 border border-gray-700 px-4 py-2 text-sm text-white shadow-xl animate-slideUp"
        >
          {toast}
        </div>
      )}

      {/* Winner */}
      {winnerTeam && !winnerDismissed && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-800 rounded-xl p-6 sm:p-8 max-w-md w-full border-2 border-yellow-400 shadow-2xl text-center space-y-4 animate-slideUp">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              🎉 {winnerTeam.toUpperCase()} {game.seats.length === 4 ? 'TEAM ' : ''}WINS! 🎉
            </h2>
            <p className="text-gray-300">
              {winnerTeam === myTeam ? 'Nice work!' : 'Better luck next game.'}{' '}
              {game.seats.filter(s => s.team === winnerTeam).map(s => s.name).join(' & ')} capped 4 scores.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => send({ type: 'newGame' })}
                className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg"
              >
                New game
              </button>
              <button
                onClick={() => setWinnerDismissed(true)}
                className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg"
              >
                Review board
              </button>
            </div>
          </div>
        </div>
      )}
      {winnerTeam && winnerDismissed && (
        <div className="fixed safe-bottom-4 safe-right-4 z-40">
          <button
            onClick={() => send({ type: 'newGame' })}
            className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-xl"
          >
            New game
          </button>
        </div>
      )}
    </main>
  )
}
