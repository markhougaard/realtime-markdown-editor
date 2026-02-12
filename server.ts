import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { WebSocketServer } from 'ws'
import * as Y from 'yjs'
import { setupWSConnection, setPersistence } from 'y-websocket/bin/utils'
import { store } from './src/lib/db'

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

async function main() {
  await app.prepare()

  setPersistence({
    bindState: async (docName: string, ydoc: Y.Doc) => {
      const doc = store.getDocument(docName)
      if (doc?.content) {
        Y.applyUpdate(ydoc, new Uint8Array(doc.content))
      }
    },
    writeState: async (docName: string, ydoc: Y.Doc) => {
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

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request)
    })
  })

  wss.on('connection', (ws, req) => {
    setupWSConnection(ws, req)
  })

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
  })
}

main().catch(console.error)
