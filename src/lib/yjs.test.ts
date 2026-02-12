import { describe, it, expect } from 'vitest'
import * as Y from 'yjs'
import { createEmptyYjsDoc, createYjsDocFromText } from './yjs'

describe('createEmptyYjsDoc', () => {
  it('creates a valid Yjs document buffer', () => {
    const buffer = createEmptyYjsDoc()
    expect(buffer).toBeInstanceOf(Buffer)

    const ydoc = new Y.Doc()
    Y.applyUpdate(ydoc, new Uint8Array(buffer))
    expect(ydoc.getText('codemirror').toString()).toBe('')
    ydoc.destroy()
  })
})

describe('createYjsDocFromText', () => {
  it('creates a Yjs document with the given text', () => {
    const text = '# Hello World\n\nThis is a test.'
    const buffer = createYjsDocFromText(text)

    const ydoc = new Y.Doc()
    Y.applyUpdate(ydoc, new Uint8Array(buffer))
    expect(ydoc.getText('codemirror').toString()).toBe(text)
    ydoc.destroy()
  })

  it('handles empty string', () => {
    const buffer = createYjsDocFromText('')

    const ydoc = new Y.Doc()
    Y.applyUpdate(ydoc, new Uint8Array(buffer))
    expect(ydoc.getText('codemirror').toString()).toBe('')
    ydoc.destroy()
  })
})
