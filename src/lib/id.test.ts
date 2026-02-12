import { describe, it, expect } from 'vitest'
import { generateId } from './id'

describe('generateId', () => {
  it('generates a string', () => {
    expect(typeof generateId()).toBe('string')
  })

  it('generates a 10-character string', () => {
    expect(generateId()).toHaveLength(10)
  })

  it('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()))
    expect(ids.size).toBe(100)
  })
})
