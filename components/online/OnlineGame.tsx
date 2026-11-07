'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Card } from '@/gameCore/types'
import { BOARD_SIZE } from '@/gameCore/constants'
import { isCardPlayable } from '@/gameCore/burnRule'
import { type CellPos, type PlayerView, type Team, checkCapCell, hasScoresToCap, permanentCapperMap } from '@/gameCore/engine'
import type { GameAction, RoomUpdate } from '@/lib/protocol'
import { api } from '@/lib/socket'
import BoardCell from '../BoardCell'
import HandComponent from '../Hand'
import DiscardPile from '../DiscardPile'
import DiscardPileView from '../DiscardPileView'

const TEAM_TEXT: Record<Team, string> = { red: 'text-red-400', blue: 'text-blue-400' }
const TEAM_DOT: Record<Team, string> = { red: 'bg-red-600', blue: 'bg-blue-600' }

type Props = { room: RoomUpdate; game: PlayerView; onLeave: () => void }

export default function OnlineGame({ room, game, onLeave }: Props) {
  const me = game.seats.find(s => s.id === game.you)!
  const myTeam = me.team
  const current = game.seats.find(s => s.id === game.currentPlayerId)!
  const myTurn = game.currentPlayerId === game.you && !game.winner

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [jokerAction, setJokerAction] = useState<'add' | 'remove' | null>(null)
  const [capMode, setCapMode] = useState(false)
  const [capSelection, setCapSelection] = useState<CellPos[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [showDiscards, setShowDiscards] = useState(false)
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
  const canBurn = myTurn && selectedCard ? !isCardPlayable(selectedCard, game.board) : false
  const winnerTeam = game.winner

  return (
    <main className="min-h-screen bg-gray-900 px-2 sm:px-4 py-4">
      <div className="w-full max-w-4xl mx-auto space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <button onClick={onLeave} className="text-sm text-gray-400 hover:text-white">← Leave</button>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Quad Sequence</h1>
          <span className="text-xs sm:text-sm font-mono text-gray-400">Code {room.code}</span>
        </div>

        {/* Scores and players */}
        <section className="bg-gray-800 rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-around text-center">
            <div>
              <div className="text-xs text-gray-300 font-semibold">Red</div>
              <div className="text-2xl font-bold text-red-500">{scores.red}/4</div>
            </div>
            <div className="min-w-0 px-2">
              <div className={`text-lg font-bold ${myTurn ? 'text-yellow-300' : TEAM_TEXT[current.team]}`}>
                {winnerTeam ? `${winnerTeam.toUpperCase()} wins!` : myTurn ? 'Your turn!' : `${current.name}'s turn`}
              </div>
              {game.lastEvent && <div className="text-xs text-gray-400 truncate">{game.lastEvent}</div>}
            </div>
            <div>
              <div className="text-xs text-gray-300 font-semibold">Blue</div>
              <div className="text-2xl font-bold text-blue-500">{scores.blue}/4</div>
            </div>
          </div>
          <ol className="flex flex-wrap justify-center gap-2" aria-label="Turn order">
            {game.seats.map(seat => {
              const isTurn = seat.id === game.currentPlayerId && !game.winner
              const online = connectedById.get(seat.id) ?? false
              return (
                <li
                  key={seat.id}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs sm:text-sm text-white transition-colors ${
                    isTurn ? 'bg-yellow-500/20 ring-2 ring-yellow-400' : 'bg-gray-900/70'
                  } ${online ? '' : 'opacity-50'}`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${TEAM_DOT[seat.team]}`} aria-hidden />
                  <span className="max-w-[7rem] truncate">{seat.name}</span>
                  {seat.id === game.you && <span className="text-gray-400">(you)</span>}
                  <span className="text-gray-400">· {seat.cardCount}🂠</span>
                  {!online && <span className="text-gray-400">offline</span>}
                </li>
              )
            })}
          </ol>
        </section>

        {/* Your hand, deck and discards */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-start">
          <div className="flex-1 min-w-0">
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
            />
          </div>
          <div className="flex sm:flex-col items-center gap-2 justify-center">
            <div className="text-xs text-gray-400">Deck: {game.deckCount}</div>
            {canReshuffle && (
              <button
                onClick={() => send({ type: 'shuffle' })}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg"
              >
                🔀 Shuffle &amp; Deal
              </button>
            )}
            <DiscardPile discardPile={game.discardPile} onClick={() => setShowDiscards(true)} />
          </div>
        </div>

        <DiscardPileView discardPile={game.discardPile} isOpen={showDiscards} onClose={() => setShowDiscards(false)} />

        {/* Capper */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={toggleCapMode}
            disabled={!!game.winner}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
              capMode ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-gray-800 hover:bg-gray-700'
            }`}
            title="Cap a score: pick 5 squares in a line"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white border border-gray-400">
              <span className={`h-3 w-3 rounded-full ${TEAM_DOT[myTeam]}`} />
            </span>
            {capMode ? 'Cancel capping' : `Cap a ${myTeam} score`}
          </button>
        </div>

        {capMode && (
          <div className="bg-yellow-900/50 border-2 border-yellow-500 rounded-lg p-2 text-center">
            <div className="text-yellow-200 font-bold text-sm">
              Select 5 squares in a line to cap ({capSelection.length}/5). You can cap on anyone&apos;s turn.
            </div>
            {capSelection.length > 0 && (
              <button
                onClick={() => setCapSelection([])}
                className="mt-2 px-4 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded"
              >
                Clear selection
              </button>
            )}
          </div>
        )}

        {/* Board */}
        <div
          className={`grid gap-0.5 sm:gap-1 p-1.5 sm:p-4 bg-gray-800 rounded-lg ${myTurn && !capMode ? 'ring-2 ring-yellow-400/60' : ''}`}
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
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-[90vw] rounded-lg bg-gray-950/95 border border-gray-700 px-4 py-2 text-sm text-white shadow-xl animate-slideUp"
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
        <div className="fixed bottom-4 right-4 z-40">
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
