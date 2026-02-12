import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/db'
import { generateId } from '@/lib/id'
import { createYjsDocFromText } from '@/lib/yjs'

export async function POST(request: NextRequest) {
  const { content } = await request.json()
  const id = generateId()
  const yjsContent = createYjsDocFromText(content)
  store.createDocument(id, yjsContent)
  return NextResponse.json({ id })
}
