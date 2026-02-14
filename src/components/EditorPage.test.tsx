// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EditorPage } from './EditorPage'
import * as nextNavigation from 'next/navigation'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

// Mock next/dynamic to load the component synchronously in tests
vi.mock('next/dynamic', () => ({
  default: (loader: () => Promise<unknown>) => {
    let Component: React.ComponentType | null = null
    loader().then((resolved: unknown) => {
      Component = resolved as React.ComponentType
    })
    return function DynamicWrapper(props: Record<string, unknown>) {
      return Component ? <Component {...props} /> : null
    }
  },
}))

// Mock the Editor and Preview components
vi.mock('./Editor', () => ({
  Editor: ({ onContentChange }: { onContentChange: (content: string) => void }) => (
    <div data-testid="editor">
      <input
        data-testid="editor-input"
        onChange={(e) => onContentChange(e.target.value)}
      />
    </div>
  ),
}))


vi.mock('./Preview', () => ({
  Preview: ({ content }: { content: string }) => (
    <div data-testid="preview">{content}</div>
  ),
}))

describe('EditorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders editor and preview side-by-side', async () => {
    render(<EditorPage id="test-123" />)
    await waitFor(() => {
      expect(screen.getByTestId('editor')).toBeInTheDocument()
    })
    expect(screen.getByTestId('preview')).toBeInTheDocument()
  })

  it('renders upload button', () => {
    render(<EditorPage id="test-123" />)
    expect(screen.getByRole('button', { name: 'Upload' })).toBeInTheDocument()
  })

  it('renders hidden file input with correct accept types', () => {
    render(<EditorPage id="test-123" />)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).toHaveAttribute('accept', '.md,.markdown,.txt')
  })

  it('shows overlay when dragging files over the page', async () => {
    const { container } = render(<EditorPage id="test-123" />)
    const pageElement = container.firstChild as HTMLElement

    fireEvent.dragEnter(pageElement)
    await waitFor(() => {
      expect(screen.getByText('Drop your .md or .txt file here')).toBeInTheDocument()
    })
  })

  it('hides overlay when drag leaves the page', async () => {
    const { container } = render(<EditorPage id="test-123" />)
    const pageElement = container.firstChild as HTMLElement

    fireEvent.dragEnter(pageElement)
    await waitFor(() => {
      expect(screen.getByText('Drop your .md or .txt file here')).toBeInTheDocument()
    })

    fireEvent.dragLeave(pageElement)
    await waitFor(() => {
      expect(screen.queryByText('Drop your .md or .txt file here')).not.toBeInTheDocument()
    })
  })

  it('renders upload button with correct initial state', () => {
    render(<EditorPage id="test-123" />)
    const uploadButton = screen.getByRole('button', { name: 'Upload' })

    expect(uploadButton).toHaveTextContent('Upload')
    expect(uploadButton).not.toBeDisabled()
  })

  it('triggers file input when upload button is clicked', () => {
    render(<EditorPage id="test-123" />)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const clickSpy = vi.spyOn(fileInput, 'click')

    const uploadButton = screen.getByRole('button', { name: 'Upload' })
    fireEvent.click(uploadButton)

    expect(clickSpy).toHaveBeenCalled()
  })
})
