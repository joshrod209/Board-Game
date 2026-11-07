'use client'

import { io, type Socket } from 'socket.io-client'
import type { Ack, ClientToServerEvents, GameAction, RoomSize, ServerToClientEvents } from './protocol'
import type { Team } from '../gameCore/engine'

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>

const PLAYER_KEY = 'qs-player-id'
const NAME_KEY = 'qs-name'

let memoryPlayerId: string | null = null
let socket: GameSocket | null = null

function randomId(): string {
  // crypto.randomUUID needs https, and LAN play is plain http, so build our own
  let id = ''
  for (let i = 0; i < 24; i++) id += Math.floor(Math.random() * 36).toString(36)
  return id
}

/**
 * Per-tab player id (sessionStorage): a refresh keeps your seat, and a new
 * tab is a new player, so one computer can test several seats.
 */
export function getPlayerId(): string {
  try {
    let id = sessionStorage.getItem(PLAYER_KEY)
    if (!id) {
      id = randomId()
      sessionStorage.setItem(PLAYER_KEY, id)
    }
    return id
  } catch {
    memoryPlayerId ??= randomId()
    return memoryPlayerId
  }
}

export function getSavedName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? ''
  } catch {
    return ''
  }
}

export function saveName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name)
  } catch {
    // Private mode etc. — the name just won't be remembered
  }
}

export function getSocket(): GameSocket {
  if (!socket) {
    socket = io({ auth: { playerId: getPlayerId() } })
  }
  return socket
}

const TIMEOUT_ERROR: Ack = { ok: false, error: "Can't reach the game server. Check your connection." }

function withTimeout(send: (ack: (res: Ack) => void) => void): Promise<Ack> {
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve(TIMEOUT_ERROR), 8000)
    send(res => {
      clearTimeout(timer)
      resolve(res)
    })
  })
}

export const api = {
  create: (name: string, size: RoomSize) => withTimeout(ack => getSocket().emit('room:create', { name, size }, ack)),
  join: (code: string, name: string) => withTimeout(ack => getSocket().emit('room:join', { code, name }, ack)),
  setTeam: (team: Team) => withTimeout(ack => getSocket().emit('room:team', { team }, ack)),
  start: () => withTimeout(ack => getSocket().emit('room:start', ack)),
  leave: () => getSocket().emit('room:leave'),
  act: (action: GameAction) => withTimeout(ack => getSocket().emit('game:action', action, ack)),
}
