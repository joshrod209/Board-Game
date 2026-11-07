/**
 * Messages shared by the Socket.io server and the browser.
 */

import type { CellPos, PlayerView, Team } from '../gameCore/engine'

export type RoomSize = 2 | 4

export type LobbyPlayer = {
  id: string
  name: string
  team: Team
  connected: boolean
}

export type RoomUpdate = {
  code: string
  size: RoomSize
  hostId: string
  players: LobbyPlayer[]
  started: boolean
  /** Your view of the game: the board plus only your own hand */
  game: PlayerView | null
}

export type GameAction =
  | { type: 'play'; cardId: string; row: number; col: number; jokerAction?: 'add' | 'remove' }
  | { type: 'burn'; cardId: string }
  | { type: 'cap'; cells: CellPos[] }
  | { type: 'shuffle' }
  | { type: 'newGame' }

export type Ack = { ok: true; code?: string } | { ok: false; error: string }

export interface ClientToServerEvents {
  'room:create': (msg: { name: string; size: RoomSize }, ack: (res: Ack) => void) => void
  'room:join': (msg: { code: string; name: string }, ack: (res: Ack) => void) => void
  'room:team': (msg: { team: Team }, ack: (res: Ack) => void) => void
  'room:start': (ack: (res: Ack) => void) => void
  'room:leave': () => void
  'game:action': (action: GameAction, ack: (res: Ack) => void) => void
}

export interface ServerToClientEvents {
  'room:update': (update: RoomUpdate) => void
}

export const NAME_MAX = 16
export const CODE_LENGTH = 4
