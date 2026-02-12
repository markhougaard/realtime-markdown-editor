import { redirect } from 'next/navigation'
import { store } from '@/lib/db'
import { generateId } from '@/lib/id'
import { createEmptyYjsDoc } from '@/lib/yjs'

export default async function HomePage() {
  const id = generateId()
  const content = createEmptyYjsDoc()
  store.createDocument(id, content)
  redirect(`/${id}`)
}
