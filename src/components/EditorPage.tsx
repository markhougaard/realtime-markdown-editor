'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Preview } from './Preview'

const Editor = dynamic(() => import('./Editor').then(mod => mod.Editor), {
  ssr: false,
})

interface EditorPageProps {
  id: string
}

export function EditorPage({ id }: EditorPageProps) {
  const router = useRouter()
  const [content, setContent] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent)
  }, [])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounterRef.current++
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      dragCounterRef.current = 0
      setIsDragging(false)

      const files = e.dataTransfer.files
      if (files.length === 0) return

      const file = files[0]
      const ext = file.name.split('.').pop()?.toLowerCase()

      if (!['md', 'markdown', 'txt'].includes(ext || '')) {
        return
      }

      setIsUploading(true)
      try {
        const text = await file.text()
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: text }),
        })

        const { id: newId } = await res.json()
        router.push(`/${newId}`)
      } finally {
        setIsUploading(false)
      }
    },
    [router]
  )

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      setIsUploading(true)
      try {
        const text = await file.text()
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: text }),
        })

        const { id: newId } = await res.json()
        router.push(`/${newId}`)
      } finally {
        setIsUploading(false)
      }
    },
    [router]
  )

  return (
    <div
      className="flex h-screen relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="w-1/2 border-r border-gray-200">
        <Editor documentId={id} onContentChange={handleContentChange} />
      </div>
      <div className="w-1/2 overflow-auto">
        <Preview content={content} />
      </div>

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 pointer-events-none">
          <div className="text-white text-lg font-medium">
            Drop your .md or .txt file here
          </div>
        </div>
      )}

      {/* Upload button */}
      <button
        onClick={handleUploadClick}
        disabled={isUploading}
        className="fixed bottom-8 right-8 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors z-40"
      >
        {isUploading ? 'Uploading...' : 'Upload'}
      </button>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.txt"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  )
}
