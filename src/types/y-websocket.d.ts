declare module 'y-websocket/bin/utils' {
  import type { Doc } from 'yjs'
  import type { IncomingMessage } from 'http'
  import type { WebSocket } from 'ws'

  interface Persistence {
    bindState: (docName: string, ydoc: Doc) => Promise<void>
    writeState: (docName: string, ydoc: Doc) => Promise<void>
  }

  export function setupWSConnection(
    conn: WebSocket,
    req: IncomingMessage,
    options?: { docName?: string; gc?: boolean }
  ): void

  export function setPersistence(persistence: Persistence): void

  export const docs: Map<string, Doc>
}
