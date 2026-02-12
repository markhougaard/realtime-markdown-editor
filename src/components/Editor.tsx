'use client'

import { useEffect, useRef } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { yCollab } from 'y-codemirror.next'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

interface EditorProps {
  documentId: string
  onContentChange: (content: string) => void
}

export function Editor({ documentId, onContentChange }: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const onContentChangeRef = useRef(onContentChange)
  onContentChangeRef.current = onContentChange

  useEffect(() => {
    if (!editorRef.current) return

    const ydoc = new Y.Doc()
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}`
    const provider = new WebsocketProvider(wsUrl, documentId, ydoc)
    const ytext = ydoc.getText('codemirror')

    const updatePreview = () => {
      onContentChangeRef.current(ytext.toString())
    }
    ytext.observe(updatePreview)

    // Also sync once the provider connects and doc loads
    provider.on('sync', () => {
      onContentChangeRef.current(ytext.toString())
    })

    const view = new EditorView({
      parent: editorRef.current,
      extensions: [
        basicSetup,
        markdown({ codeLanguages: languages }),
        yCollab(ytext, provider.awareness),
        EditorView.theme({
          '&': { height: '100%' },
          '.cm-scroller': { overflow: 'auto' },
        }),
      ],
    })

    return () => {
      ytext.unobserve(updatePreview)
      view.destroy()
      provider.destroy()
      ydoc.destroy()
    }
  }, [documentId])

  return <div ref={editorRef} className="h-full" />
}
