import { NextResponse } from 'next/server'
import { store } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Healthcheck for Docker. Read-only: it must never create a document.
// (It used to hit `/`, which creates one per request: 670k empty docs.)
export function GET() {
  try {
    store.documentExists('__health__')
    return NextResponse.json({ status: 'ok' })
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 503 })
  }
}
