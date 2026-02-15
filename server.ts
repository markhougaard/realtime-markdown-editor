import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { WebSocketServer } from 'ws'
import type * as YTypes from 'yjs'
import { setupWSConnection, setPersistence } from 'y-websocket/bin/utils'
import { store } from './src/lib/db'

// Use CJS require for yjs to get the same instance as y-websocket/bin/utils.cjs.
// ESM import resolves to yjs.mjs while require resolves to yjs.cjs — loading both
// causes "Yjs was already imported" and breaks instanceof checks / sync.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Y: typeof YTypes = require('yjs')

const dev = process.env.NODE_ENV !== 'production'
// In Docker, process.env.HOSTNAME is the container ID (e.g. "1055511de87e").
// Always bind to 0.0.0.0 in production so the server is reachable from outside the container.
const hostname = dev ? 'localhost' : '0.0.0.0'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

async function main() {
  await app.prepare()

  setPersistence({
    bindState: async (docName: string, ydoc: YTypes.Doc) => {
      const doc = store.getDocument(docName)
      if (doc?.content) {
        Y.applyUpdate(ydoc, new Uint8Array(doc.content))
      }
    },
    writeState: async (docName: string, ydoc: YTypes.Doc) => {
      const update = Y.encodeStateAsUpdate(ydoc)
      store.saveDocument(docName, Buffer.from(update))
    },
  })

  const server = createServer(async (req, res) => {
    const parsedUrl = parse(req.url!, true)
    await handle(req, res, parsedUrl)
  })

  const wss = new WebSocketServer({ noServer: true })

  server.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url!)

    // Let Next.js handle its own WebSocket connections (HMR in dev)
    if (pathname?.startsWith('/_next')) {
      return
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request)
    })
  })

  // Next.js lazily registers its own 'upgrade' listener on the HTTP server
  // (via req.socket.server) after handling the first request.  When both
  // listeners fire for a y-websocket upgrade, Next.js's handler corrupts
  // the already-upgraded socket and the connection dies with close code
  // 1006.  In production there is no HMR, so we can safely block any
  // additional 'upgrade' registrations.  In dev mode we leave them alone
  // because Next.js needs its own listener for HMR WebSocket connections.
  if (!dev) {
    const origAddListener = server.addListener.bind(server)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const guardedOn = function (event: string, listener: (...a: any[]) => void) {
      if (event === 'upgrade') return server
      return origAddListener(event, listener)
    }
    server.on = server.addListener = guardedOn as typeof server.on
  }

  wss.on('connection', (ws, req) => {
    setupWSConnection(ws, req)
  })

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
  })
}

main().catch(console.error)
