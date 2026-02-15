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

function log(msg: string) {
  console.log(`[ws] ${new Date().toISOString()} ${msg}`)
}

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

    // Let Next.js handle its own WebSocket connections (HMR)
    if (pathname?.startsWith('/_next')) {
      return
    }

    log(`upgrade request: path=${pathname} host=${request.headers.host} origin=${request.headers.origin}`)

    socket.on('error', (err) => {
      log(`socket error during upgrade: ${err.message}`)
    })

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request)
    })
  })

  wss.on('connection', (ws, req) => {
    const { pathname } = parse(req.url!)
    const docName = pathname?.slice(1) || 'unknown'
    log(`connection opened: doc=${docName} origin=${req.headers.origin}`)

    ws.on('close', (code, reason) => {
      log(`connection closed: doc=${docName} code=${code} reason=${reason?.toString() || ''}`)
    })

    ws.on('error', (err) => {
      log(`connection error: doc=${docName} error=${err.message}`)
    })

    setupWSConnection(ws, req)
  })

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
  })
}

main().catch(console.error)
