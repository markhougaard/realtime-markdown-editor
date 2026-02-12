import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/db'
import { generateId } from '@/lib/id'
import { createYjsDocFromText } from '@/lib/yjs'

// Configuration
const MAX_CONTENT_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_NESTING_DEPTH = 100 // Prevent deeply nested structures
const MAX_REPEATED_CHARS = 1_000_000 // Prevent huge repeated char sequences

/**
 * Validates markdown content for pathological structures
 * that could cause DoS (algorithmic complexity attacks)
 */
function validateContentComplexity(content: string): { valid: boolean; error?: string } {
  // Check size
  if (content.length > MAX_CONTENT_SIZE) {
    return {
      valid: false,
      error: `Content exceeds maximum size of ${MAX_CONTENT_SIZE / 1024 / 1024}MB`,
    }
  }

  // Check for deeply nested structures: [...[...]] or (...(...))
  let nesting = 0
  let maxNesting = 0
  for (const char of content) {
    if (char === '[' || char === '(' || char === '{') {
      nesting++
      maxNesting = Math.max(maxNesting, nesting)
    } else if (char === ']' || char === ')' || char === '}') {
      nesting = Math.max(0, nesting - 1)
    }
  }
  if (maxNesting > MAX_NESTING_DEPTH) {
    return {
      valid: false,
      error: `Content has ${maxNesting} levels of nesting (max ${MAX_NESTING_DEPTH})`,
    }
  }

  // Check for extremely long repeated sequences (e.g., 10K+ identical chars in a row)
  // Use a simple O(n) algorithm instead of regex to avoid ReDoS
  for (let i = 0; i < content.length; i++) {
    let repeatCount = 1
    // Count consecutive identical characters starting at position i
    while (i + 1 < content.length && content[i + 1] === content[i]) {
      repeatCount++
      i++
      // If we find more than 10K identical chars in a row, reject
      if (repeatCount >= 10001) {
        return {
          valid: false,
          error: 'Content contains excessively long repeated character sequences',
        }
      }
    }
  }

  return { valid: true }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { content } = body

    // Validate content exists
    if (typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content must be a string' },
        { status: 400 }
      )
    }

    // Validate content complexity
    const validation = validateContentComplexity(content)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // Create document
    const id = generateId()
    const yjsContent = createYjsDocFromText(content)
    store.createDocument(id, yjsContent)

    return NextResponse.json({ id })
  } catch (error) {
    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    )
  }
}
