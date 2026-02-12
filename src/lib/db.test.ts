import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { DocumentStore } from './db'

describe('DocumentStore', () => {
  let store: DocumentStore

  beforeEach(() => {
    store = new DocumentStore(':memory:')
  })

  afterEach(() => {
    store.close()
  })

  describe('createDocument', () => {
    it('creates a document with no content', () => {
      store.createDocument('test-id')
      const doc = store.getDocument('test-id')
      expect(doc).toBeDefined()
      expect(doc!.id).toBe('test-id')
      expect(doc!.content).toBeNull()
    })

    it('creates a document with content', () => {
      const content = Buffer.from('hello world')
      store.createDocument('test-id', content)
      const doc = store.getDocument('test-id')
      expect(doc).toBeDefined()
      expect(Buffer.from(doc!.content!)).toEqual(content)
    })

    it('throws on duplicate id', () => {
      store.createDocument('test-id')
      expect(() => store.createDocument('test-id')).toThrow()
    })
  })

  describe('getDocument', () => {
    it('returns undefined for non-existent document', () => {
      expect(store.getDocument('nonexistent')).toBeUndefined()
    })
  })

  describe('saveDocument', () => {
    it('creates document if it does not exist', () => {
      const content = Buffer.from('hello')
      store.saveDocument('new-id', content)
      const doc = store.getDocument('new-id')
      expect(doc).toBeDefined()
      expect(Buffer.from(doc!.content!)).toEqual(content)
    })

    it('updates content of existing document', () => {
      store.createDocument('test-id', Buffer.from('old'))
      store.saveDocument('test-id', Buffer.from('new'))
      const doc = store.getDocument('test-id')
      expect(Buffer.from(doc!.content!)).toEqual(Buffer.from('new'))
    })
  })

  describe('documentExists', () => {
    it('returns false for non-existent document', () => {
      expect(store.documentExists('nonexistent')).toBe(false)
    })

    it('returns true for existing document', () => {
      store.createDocument('test-id')
      expect(store.documentExists('test-id')).toBe(true)
    })
  })
})
