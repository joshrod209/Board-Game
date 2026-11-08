/**
 * Game rooms: join codes, lobby/team picking, and relaying moves to the engine.
 *
 * Rooms live in memory, so they reset when the server restarts. Each player is
 * identified by a random id the browser keeps, which lets a refreshed or
 * dropped player slip back into their seat with their hand intact.
 */

import type { Server, Socket } from 'socket.io'
import {
  type GameState,
  type EngineResult,
  type Team,
  orderSeats,
  createGame,
  playCard,
  burnCard,
  passTurn,
  capCells,
  shuffleAndDeal,
  newGame,
  viewFor,
} from '../gameCore/engine'
import {
  type Ack,
  type ClientToServerEvents,
  type GameAction,
  type LobbyPlayer,
  type RoomSize,
  type ServerToClientEvents,
  CODE_LENGTH,
  NAME_MAX,
} from '../lib/protocol'

type IO = Server<ClientToServerEvents, ServerToClientEvents>
type ClientSocket = Socket<ClientToServerEvents, ServerToClientEvents>

type Room = {
  code: string
  size: RoomSize
  hostId: string
  players: LobbyPlayer[]
  game: GameState | null
  lastActive: number
}

const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ' // no I or O, easy to read aloud
const LOBBY_GRACE_MS = 30_000 // drop a disconnected player from a lobby after this
const ROOM_IDLE_MS = 2 * 60 * 60 * 1000 // delete empty rooms after 2 hours

export const rooms = new Map<string, Room>()
/** playerId -> socket id currently speaking for that player */
const playerSockets = new Map<string, string>()
/** playerId -> room code */
const playerRooms = new Map<string, string>()
const lobbyDropTimers = new Map<string, NodeJS.Timeout>()

function newCode(): string {
  for (;;) {
    let code = ''
    for (let i = 0; i < CODE_LENGTH; i++) code += CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)]
    if (!rooms.has(code)) return code
  }
}

function cleanName(name: unknown): string | null {
  if (typeof name !== 'string') return null
  const trimmed = name.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX)
  return trimmed.length > 0 ? trimmed : null
}

function teamCount(room: Room, team: Team) {
  return room.players.filter(p => p.team === team).length
}

function broadcast(io: IO, room: Room) {
  room.lastActive = Date.now()
  for (const player of room.players) {
    const socketId = playerSockets.get(player.id)
    if (!socketId) continue
    const seated = room.game?.seats.some(s => s.id === player.id)
    io.to(socketId).emit('room:update', {
      code: room.code,
      size: room.size,
      hostId: room.hostId,
      players: room.players,
      started: room.game !== null,
      game: room.game && seated ? viewFor(room.game, player.id) : null,
    })
  }
}

function removeFromRoom(io: IO, room: Room, playerId: string) {
  room.players = room.players.filter(p => p.id !== playerId)
  playerRooms.delete(playerId)
  if (room.players.length === 0) {
    rooms.delete(room.code)
    return
  }
  if (room.hostId === playerId) room.hostId = room.players[0].id
  broadcast(io, room)
}

/**
 * Leave a room. In a lobby you're removed; in a started game your seat (and
 * hand) is kept for you and simply shows as offline until you come back.
 */
function leaveRoom(io: IO, room: Room, playerId: string) {
  playerRooms.delete(playerId)
  if (room.game) {
    const me = room.players.find(p => p.id === playerId)
    if (me) me.connected = false
    broadcast(io, room)
  } else {
    removeFromRoom(io, room, playerId)
  }
}

/**
 * Hand an offline seat to a new player id. Used when someone closes their
 * tab (losing their id) and reopens the invite link with the same name.
 */
function reassignSeat(io: IO, room: Room, oldId: string, newId: string) {
  const swap = (id: string) => (id === oldId ? newId : id)
  room.players = room.players.map(p => (p.id === oldId ? { ...p, id: newId, connected: true } : p))
  room.hostId = swap(room.hostId)
  if (room.game) {
    const { [oldId]: hand, ...hands } = room.game.hands
    room.game = {
      ...room.game,
      seats: room.game.seats.map(s => ({ ...s, id: swap(s.id) })),
      hands: { ...hands, [newId]: hand ?? [] },
      discardPile: room.game.discardPile.map(c => ({ ...c, playedBy: swap(c.playedBy) })),
      lastMove: room.game.lastMove ? { ...room.game.lastMove, by: swap(room.game.lastMove.by) } : null,
    }
  }
  playerRooms.delete(oldId)
  playerRooms.set(newId, room.code)
  const oldSocket = playerSockets.get(oldId)
  if (oldSocket) io.sockets.sockets.get(oldSocket)?.disconnect(true)
  playerSockets.delete(oldId)
  clearTimeout(lobbyDropTimers.get(oldId))
  lobbyDropTimers.delete(oldId)
}

function applyAction(room: Room, playerId: string, action: GameAction): EngineResult {
  const game = room.game!
  switch (action?.type) {
    case 'play':
      return playCard(game, playerId, String(action.cardId), Number(action.row), Number(action.col), action.jokerAction)
    case 'burn':
      return burnCard(game, playerId, String(action.cardId))
    case 'pass':
      return passTurn(game, playerId)
    case 'cap':
      if (!Array.isArray(action.cells)) return { ok: false, error: 'Bad cap request' }
      return capCells(
        game,
        playerId,
        action.cells.map(c => ({ row: Number(c?.row), col: Number(c?.col) }))
      )
    case 'shuffle':
      return shuffleAndDeal(game, playerId)
    case 'newGame':
      return newGame(game, playerId)
    default:
      return { ok: false, error: 'Unknown action' }
  }
}

export function registerRoomHandlers(io: IO) {
  io.on('connection', (socket: ClientSocket) => {
    const playerId = typeof socket.handshake.auth?.playerId === 'string' ? socket.handshake.auth.playerId.slice(0, 64) : ''
    if (!playerId) {
      socket.disconnect(true)
      return
    }

    // A newer tab or reconnect takes over for this player
    const oldSocketId = playerSockets.get(playerId)
    if (oldSocketId && oldSocketId !== socket.id) io.sockets.sockets.get(oldSocketId)?.disconnect(true)
    playerSockets.set(playerId, socket.id)

    const reply = (ack: unknown, res: Ack) => {
      if (typeof ack === 'function') ack(res)
    }

    const myRoom = (): Room | undefined => {
      const code = playerRooms.get(playerId)
      return code ? rooms.get(code) : undefined
    }

    const markConnected = (room: Room) => {
      const me = room.players.find(p => p.id === playerId)
      if (me) me.connected = true
      clearTimeout(lobbyDropTimers.get(playerId))
      lobbyDropTimers.delete(playerId)
    }

    // Already in a room? (page refresh / dropped connection) Rejoin it.
    const existing = myRoom()
    if (existing) {
      markConnected(existing)
      broadcast(io, existing)
    }

    socket.on('room:create', (msg, ack) => {
      const name = cleanName(msg?.name)
      const size: RoomSize = msg?.size === 4 ? 4 : 2
      if (!name) return reply(ack, { ok: false, error: 'Enter your name first' })

      const current = myRoom()
      if (current) leaveRoom(io, current, playerId)

      const room: Room = {
        code: newCode(),
        size,
        hostId: playerId,
        players: [{ id: playerId, name, team: 'red', connected: true }],
        game: null,
        lastActive: Date.now(),
      }
      rooms.set(room.code, room)
      playerRooms.set(playerId, room.code)
      reply(ack, { ok: true, code: room.code })
      broadcast(io, room)
    })

    socket.on('room:join', (msg, ack) => {
      const code = typeof msg?.code === 'string' ? msg.code.trim().toUpperCase() : ''
      const name = cleanName(msg?.name)
      const room = rooms.get(code)
      if (!room) return reply(ack, { ok: false, error: `No game found with code ${code || '(blank)'}` })

      const me = room.players.find(p => p.id === playerId)
      if (me) {
        // Rejoining your own seat
        if (name && !room.game) me.name = name
        markConnected(room)
        playerRooms.set(playerId, room.code)
        reply(ack, { ok: true, code })
        return broadcast(io, room)
      }

      if (!name) return reply(ack, { ok: false, error: 'Enter your name first' })

      if (room.game) {
        // Closed your tab or switched devices? Take back your offline seat by name.
        const seat = room.players.find(p => !p.connected && p.name.toLowerCase() === name.toLowerCase())
        if (!seat) {
          const offline = room.players.filter(p => !p.connected).map(p => p.name)
          return reply(ack, {
            ok: false,
            error: offline.length
              ? `That game has already started. To take back your seat, join with your name from the game (${offline.join(', ')})`
              : 'That game has already started',
          })
        }
        const current = myRoom()
        if (current && current !== room) leaveRoom(io, current, playerId)
        reassignSeat(io, room, seat.id, playerId)
        reply(ack, { ok: true, code })
        return broadcast(io, room)
      }
      if (room.players.length >= room.size) return reply(ack, { ok: false, error: 'That game is full' })

      const current = myRoom()
      if (current && current !== room) leaveRoom(io, current, playerId)

      const team: Team = teamCount(room, 'red') <= teamCount(room, 'blue') ? 'red' : 'blue'
      room.players.push({ id: playerId, name, team, connected: true })
      playerRooms.set(playerId, room.code)
      reply(ack, { ok: true, code })
      broadcast(io, room)
    })

    socket.on('room:team', (msg, ack) => {
      const room = myRoom()
      const me = room?.players.find(p => p.id === playerId)
      if (!room || !me) return reply(ack, { ok: false, error: 'You are not in a game' })
      if (room.game) return reply(ack, { ok: false, error: 'Teams are locked once the game starts' })
      const team: Team = msg?.team === 'blue' ? 'blue' : 'red'
      if (me.team !== team && teamCount(room, team) >= room.size / 2) {
        return reply(ack, { ok: false, error: `The ${team} team is full` })
      }
      me.team = team
      reply(ack, { ok: true })
      broadcast(io, room)
    })

    socket.on('room:start', ack => {
      const room = myRoom()
      if (!room) return reply(ack, { ok: false, error: 'You are not in a game' })
      if (room.hostId !== playerId) return reply(ack, { ok: false, error: 'Only the host can start the game' })
      if (room.game) return reply(ack, { ok: false, error: 'The game already started' })
      if (room.players.length !== room.size) {
        return reply(ack, { ok: false, error: `Waiting for ${room.size - room.players.length} more player(s)` })
      }
      const ordered = orderSeats(room.players.map(({ id, name, team }) => ({ id, name, team })))
      if (!ordered.ok) return reply(ack, { ok: false, error: ordered.error })
      room.game = createGame(ordered.seats)
      room.game.lastEvent = `Game on! ${ordered.seats[0].name} goes first`
      reply(ack, { ok: true })
      broadcast(io, room)
    })

    socket.on('room:leave', () => {
      const room = myRoom()
      if (room) leaveRoom(io, room, playerId)
    })

    socket.on('game:action', (action, ack) => {
      const room = myRoom()
      if (!room?.game) return reply(ack, { ok: false, error: 'The game has not started' })
      const result = applyAction(room, playerId, action)
      if (!result.ok) return reply(ack, result)
      room.game = result.state
      reply(ack, { ok: true })
      broadcast(io, room)
    })

    socket.on('disconnect', () => {
      if (playerSockets.get(playerId) !== socket.id) return // replaced by a newer connection
      playerSockets.delete(playerId)
      const room = myRoom()
      const me = room?.players.find(p => p.id === playerId)
      if (!room || !me) return
      me.connected = false
      broadcast(io, room)
      if (!room.game) {
        lobbyDropTimers.set(
          playerId,
          setTimeout(() => {
            lobbyDropTimers.delete(playerId)
            if (!me.connected && rooms.get(room.code) === room && !room.game) removeFromRoom(io, room, playerId)
          }, LOBBY_GRACE_MS)
        )
      }
    })
  })

  // Sweep out rooms nobody has touched in a while
  setInterval(() => {
    const now = Date.now()
    for (const room of Array.from(rooms.values())) {
      const anyoneHere = room.players.some(p => p.connected)
      if (!anyoneHere && now - room.lastActive > ROOM_IDLE_MS) {
        room.players.forEach(p => playerRooms.delete(p.id))
        rooms.delete(room.code)
      }
    }
  }, 10 * 60 * 1000).unref()
}
