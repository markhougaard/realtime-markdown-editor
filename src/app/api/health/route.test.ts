import { describe, it, expect, vi, afterEach } from 'vitest'
import { GET } from './route'
import { store } from '@/lib/db'

describe('GET /api/health', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 200 with status ok', async () => {
    const response = GET()
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'ok' })
  })

  it('does not create a document', () => {
    const create = vi.spyOn(store, 'createDocument')
    GET()
    expect(create).not.toHaveBeenCalled()
  })

  it('returns 503 when the database is unavailable', async () => {
    vi.spyOn(store, 'documentExists').mockImplementation(() => {
      throw new Error('db down')
    })
    const response = GET()
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ status: 'error' })
  })
})
