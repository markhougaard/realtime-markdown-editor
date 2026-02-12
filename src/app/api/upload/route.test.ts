import { describe, it, expect, beforeEach } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'

/**
 * Tests for upload API security validation
 * Ensures pathological content is rejected before storage
 */
describe('POST /api/upload', () => {
  let mockRequest: Partial<NextRequest>

  beforeEach(() => {
    mockRequest = {
      json: async () => ({ content: 'valid content' }),
    }
  })

  describe('valid content', () => {
    it('accepts normal markdown content', async () => {
      mockRequest.json = async () => ({
        content: '# Hello World\n\nThis is valid markdown.',
      })

      const response = await POST(mockRequest as NextRequest)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.id).toBeDefined()
      expect(json.id).toMatch(/^[a-zA-Z0-9_-]+$/)
    })

    it('accepts 1MB of varied content', async () => {
      // Create varied content (not pathological repeated chars)
      let content = ''
      for (let i = 0; i < 1024; i++) {
        content += `Line ${i}: This is some normal markdown content.\n`
      }
      // Roughly 1MB after repetition
      while (content.length < 1024 * 1024) {
        content += `# Section\nMore content\n`
      }
      mockRequest.json = async () => ({ content: content.slice(0, 1024 * 1024) })

      const response = await POST(mockRequest as NextRequest)
      expect(response.status).toBe(200)
    })

    it('accepts up to 10MB of varied content', async () => {
      // Create varied large content
      let content = ''
      for (let i = 0; i < 10000; i++) {
        content += `Line ${i}: Normal markdown with varied content.\n`
      }
      // Ensure we reach ~10MB
      while (content.length < 10 * 1024 * 1024) {
        content += '# More sections\nWith normal content\n\n'
      }
      mockRequest.json = async () => ({ content: content.slice(0, 10 * 1024 * 1024) })

      const response = await POST(mockRequest as NextRequest)
      expect(response.status).toBe(200)
    })

    it('accepts reasonable nesting depth', async () => {
      // 50 levels of nesting is reasonable
      const nested = '['.repeat(50) + 'content' + ']'.repeat(50)
      mockRequest.json = async () => ({ content: nested })

      const response = await POST(mockRequest as NextRequest)
      expect(response.status).toBe(200)
    })
  })

  describe('invalid content - size limits', () => {
    it('rejects content over 10MB', async () => {
      const oversized = 'a'.repeat(10 * 1024 * 1024 + 1)
      mockRequest.json = async () => ({ content: oversized })

      const response = await POST(mockRequest as NextRequest)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toContain('10MB')
    })

    it('rejects content over 100MB', async () => {
      const huge = 'a'.repeat(100 * 1024 * 1024)
      mockRequest.json = async () => ({ content: huge })

      const response = await POST(mockRequest as NextRequest)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toContain('exceeds maximum size')
    })
  })

  describe('invalid content - nesting depth', () => {
    it('rejects deeply nested brackets (>100 levels)', async () => {
      const deepNested = '['.repeat(150) + 'x' + ']'.repeat(150)
      mockRequest.json = async () => ({ content: deepNested })

      const response = await POST(mockRequest as NextRequest)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toContain('nesting')
      expect(json.error).toContain('150')
    })

    it('rejects deeply nested parentheses (>100 levels)', async () => {
      const deepNested = '('.repeat(120) + 'x' + ')'.repeat(120)
      mockRequest.json = async () => ({ content: deepNested })

      const response = await POST(mockRequest as NextRequest)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toContain('nesting')
    })

    it('rejects deeply nested braces (>100 levels)', async () => {
      const deepNested = '{'.repeat(101) + 'x' + '}'.repeat(101)
      mockRequest.json = async () => ({ content: deepNested })

      const response = await POST(mockRequest as NextRequest)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toContain('nesting')
      expect(json.error).toContain('101')
    })
  })

  describe('invalid content - repeated characters', () => {
    it('rejects 10k+ repeated characters', async () => {
      const repeated = 'a'.repeat(10001)
      mockRequest.json = async () => ({ content: repeated })

      const response = await POST(mockRequest as NextRequest)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toContain('repeated character')
    })

    it('rejects pathological markdown: huge backtick sequence', async () => {
      const pathological = '`'.repeat(20000) + 'code' + '`'.repeat(20000)
      mockRequest.json = async () => ({ content: pathological })

      const response = await POST(mockRequest as NextRequest)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toContain('repeated character')
    })

    it('rejects pathological markdown: repeated tildes', async () => {
      const pathological = '~'.repeat(15000)
      mockRequest.json = async () => ({ content: pathological })

      const response = await POST(mockRequest as NextRequest)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toContain('repeated character')
    })

    it('accepts up to 9999 repeated characters', async () => {
      const acceptable = 'a'.repeat(9999)
      mockRequest.json = async () => ({ content: acceptable })

      const response = await POST(mockRequest as NextRequest)
      expect(response.status).toBe(200)
    })
  })

  describe('edge case nesting patterns', () => {
    it('accepts lines with many brackets (not nested)', async () => {
      // Many brackets on one line but not nested deeply
      const manyBrackets = '[]'.repeat(1000)
      mockRequest.json = async () => ({ content: manyBrackets })

      const response = await POST(mockRequest as NextRequest)
      expect(response.status).toBe(200)
    })

    it('accepts mixed bracket types at safe nesting', async () => {
      const mixed = '['.repeat(50) + '(' .repeat(50) + 'x' + ')'.repeat(50) + ']'.repeat(50)
      mockRequest.json = async () => ({ content: mixed })

      const response = await POST(mockRequest as NextRequest)
      expect(response.status).toBe(200)
    })
  })

  describe('invalid request format', () => {
    it('returns 400 for missing content field', async () => {
      mockRequest.json = async () => ({})

      const response = await POST(mockRequest as NextRequest)
      const json = await response.json()

      expect(response.status).toBe(400)
    })

    it('returns 400 for null content', async () => {
      mockRequest.json = async () => ({ content: null })

      const response = await POST(mockRequest as NextRequest)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toContain('must be a string')
    })

    it('returns 400 for non-string content', async () => {
      mockRequest.json = async () => ({ content: 12345 })

      const response = await POST(mockRequest as NextRequest)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toContain('must be a string')
    })

    it('returns 400 for array content', async () => {
      mockRequest.json = async () => ({ content: ['a', 'b'] })

      const response = await POST(mockRequest as NextRequest)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toContain('must be a string')
    })

    it('returns 400 for malformed JSON', async () => {
      mockRequest.json = async () => {
        throw new SyntaxError('Unexpected token')
      }

      const response = await POST(mockRequest as NextRequest)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toContain('Invalid JSON')
    })
  })

  describe('edge cases', () => {
    it('accepts empty string', async () => {
      mockRequest.json = async () => ({ content: '' })

      const response = await POST(mockRequest as NextRequest)
      expect(response.status).toBe(200)
    })

    it('accepts single character', async () => {
      mockRequest.json = async () => ({ content: 'a' })

      const response = await POST(mockRequest as NextRequest)
      expect(response.status).toBe(200)
    })

    it('accepts unicode/emoji content', async () => {
      mockRequest.json = async () => ({ content: '# 你好 🎉\n\nEmoji markdown' })

      const response = await POST(mockRequest as NextRequest)
      expect(response.status).toBe(200)
    })

    it('accepts html entities in markdown', async () => {
      mockRequest.json = async () => ({
        content: '&nbsp; &copy; &quot; &lt; &gt;',
      })

      const response = await POST(mockRequest as NextRequest)
      expect(response.status).toBe(200)
    })

    it('accepts newlines and special characters', async () => {
      mockRequest.json = async () => ({
        content: '# Title\n\n```js\nconst x = "test";\n```\n\nFinal line',
      })

      const response = await POST(mockRequest as NextRequest)
      expect(response.status).toBe(200)
    })
  })

  describe('real-world DoS attempts', () => {
    it('rejects huge sequence of backticks (10K+)', async () => {
      const pathological = '`'.repeat(20000)
      mockRequest.json = async () => ({ content: pathological })

      const response = await POST(mockRequest as NextRequest)
      expect(response.status).toBe(400)
      expect((await response.json()).error).toContain('repeated character')
    })

    it('rejects huge sequence of pipes (10K+)', async () => {
      const pathological = '|'.repeat(15000)
      mockRequest.json = async () => ({ content: pathological })

      const response = await POST(mockRequest as NextRequest)
      expect(response.status).toBe(400)
      expect((await response.json()).error).toContain('repeated character')
    })

    it('rejects huge sequence of dashes (10K+)', async () => {
      const pathological = '-'.repeat(11000)
      mockRequest.json = async () => ({ content: pathological })

      const response = await POST(mockRequest as NextRequest)
      expect(response.status).toBe(400)
      expect((await response.json()).error).toContain('repeated character')
    })

    it('accepts normal markdown with mixed characters', async () => {
      const normal = 'A'.repeat(5000) + 'B'.repeat(5000) + 'C'.repeat(5000)
      mockRequest.json = async () => ({ content: normal })

      const response = await POST(mockRequest as NextRequest)
      expect(response.status).toBe(200)
    })
  })
})
