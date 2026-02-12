import { redirect } from 'next/navigation'
import { store } from '@/lib/db'
import { generateId } from '@/lib/id'
import { createEmptyYjsDoc } from '@/lib/yjs'

export async function GET() {
  const id = generateId()
  const content = createEmptyYjsDoc()
  store.createDocument(id, content)
  redirect(`/${id}`)
}
