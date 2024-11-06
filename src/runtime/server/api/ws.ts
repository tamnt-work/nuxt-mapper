import type { Server } from 'node:http'
import { defineEventHandler } from 'h3'
import { WebSocketServer, WebSocket } from 'ws'

let wss: WebSocketServer | null = null
const wsClients = new Set<WebSocket>()

export function broadcastWsMessage(type: string, data: any) {
  const message = JSON.stringify({ type, data })
  for (const client of wsClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message)
    }
  }
}

export default defineEventHandler((event) => {
  if (!event.node.req.url?.startsWith('/ws/_data-mapper'))
    return

  // Initialize WebSocket server if not already created
  if (!wss) {
    const server = event.node.res.socket?.server as Server
    wss = new WebSocketServer({
      noServer: true,
      path: '/ws/_data-mapper',
    })

    server.on('upgrade', (request, socket, head) => {
      if (request.url?.startsWith('/ws/_data-mapper')) {
        wss?.handleUpgrade(request, socket, head, (ws) => {
          wsClients.add(ws)
          ws.send(JSON.stringify({ type: 'connected', data: 'WebSocket connected' }))
          ws.on('close', () => {
            wsClients.delete(ws)
          })
        })
      }
    })
  }

  return { handled: true }
})
