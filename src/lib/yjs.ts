import * as Y from 'yjs'

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
