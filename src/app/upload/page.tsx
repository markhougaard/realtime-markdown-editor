'use client'

import { useRouter } from 'next/navigation'
import { useState, useRef } from 'react'

export default function UploadPage() {
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    const file = fileInputRef.current?.files?.[0]
    if (!file) return

    setIsUploading(true)
    const text = await file.text()

    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text }),
    })

    const { id } = await res.json()
    router.push(`/${id}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <form onSubmit={handleUpload} className="space-y-6 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Upload Markdown</h1>
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.markdown,.txt"
          required
          className="block text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-900 file:text-white hover:file:bg-gray-700"
        />
        <button
          type="submit"
          disabled={isUploading}
          className="px-6 py-3 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {isUploading ? 'Uploading...' : 'Upload'}
        </button>
      </form>
    </div>
  )
}
