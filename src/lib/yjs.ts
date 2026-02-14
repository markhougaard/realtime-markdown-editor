import type * as YTypes from 'yjs'

// Use CJS require to get the same yjs instance as y-websocket/bin/utils.cjs.
// ESM import resolves to yjs.mjs, require resolves to yjs.cjs — loading both
// causes "Yjs was already imported" and breaks instanceof checks / sync.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Y: typeof YTypes = require('yjs')

const TEXT_NAME = 'codemirror'

export function createEmptyYjsDoc(): Buffer {
  const ydoc = new Y.Doc()
  ydoc.getText(TEXT_NAME)
  const update = Y.encodeStateAsUpdate(ydoc)
  ydoc.destroy()
  return Buffer.from(update)
}

export function createYjsDocFromText(text: string): Buffer {
  const ydoc = new Y.Doc()
  const ytext = ydoc.getText(TEXT_NAME)
  ytext.insert(0, text)
  const update = Y.encodeStateAsUpdate(ydoc)
  ydoc.destroy()
  return Buffer.from(update)
}
