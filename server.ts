/**
 * Custom server: Next.js pages plus Socket.io for online games, on one port.
 *
 *   npm run dev     -> development, listens on all interfaces so phones on
 *                      the same Wi-Fi can join
 *   npm run build && npm start -> production
 */

import { createServer } from 'node:http'
import { networkInterfaces } from 'node:os'
import next from 'next'
import { Server } from 'socket.io'
import { registerRoomHandlers } from './server/rooms'
import type { ClientToServerEvents, ServerToClientEvents } from './lib/protocol'

const dev = process.env.NODE_ENV !== 'production'
const port = Number(process.env.PORT) || 3000
const hostname = process.env.HOST || '0.0.0.0'

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

function lanAddresses(): string[] {
  return Object.values(networkInterfaces())
    .flat()
    .filter(i => i && i.family === 'IPv4' && !i.internal)
    .map(i => i!.address)
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res))

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    // Leave other websocket upgrades (Next's hot reload) alone
    destroyUpgrade: false,
  })
  registerRoomHandlers(io)

  const nextUpgrade = app.getUpgradeHandler()
  httpServer.on('upgrade', (req, socket, head) => {
    if (!req.url?.startsWith('/socket.io')) nextUpgrade(req, socket, head)
  })

  httpServer.listen(port, hostname, () => {
    console.log(`\n  Quad Sequence ready${dev ? ' (dev)' : ''}`)
    console.log(`  - On this computer: http://localhost:${port}`)
    for (const ip of lanAddresses()) console.log(`  - Same Wi-Fi:       http://${ip}:${port}`)
    console.log('')
  })
})
