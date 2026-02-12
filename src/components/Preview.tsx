'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import 'github-markdown-css/github-markdown-light.css'

interface PreviewProps {
  content: string
}

export function Preview({ content }: PreviewProps) {
  return (
    <div className="markdown-body p-8">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
