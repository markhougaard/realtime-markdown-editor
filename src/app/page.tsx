import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold text-gray-900">Markdown Editor</h1>
        <p className="text-lg text-gray-500">
          Real-time collaborative Markdown editing
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/new"
            className="px-6 py-3 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition-colors"
          >
            New Document
          </Link>
          <Link
            href="/upload"
            className="px-6 py-3 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
          >
            Upload .md
          </Link>
        </div>
      </div>
    </div>
  )
}
