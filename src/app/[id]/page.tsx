import { store } from '@/lib/db'
import { notFound } from 'next/navigation'
import { EditorPage } from '@/components/EditorPage'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function DocumentPage({ params }: PageProps) {
  const { id } = await params

  if (!store.documentExists(id)) {
    notFound()
  }

  return <EditorPage id={id} />
}
