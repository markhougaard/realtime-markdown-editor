'use client'

import { useState, useCallback } from 'react'
import { Editor } from './Editor'
import { Preview } from './Preview'

interface EditorPageProps {
  id: string
}

export function EditorPage({ id }: EditorPageProps) {
  const [content, setContent] = useState('')

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent)
  }, [])

  return (
    <div className="flex h-screen">
      <div className="w-1/2 border-r border-gray-200">
        <Editor documentId={id} onContentChange={handleContentChange} />
      </div>
      <div className="w-1/2 overflow-auto">
        <Preview content={content} />
      </div>
    </div>
  )
}
