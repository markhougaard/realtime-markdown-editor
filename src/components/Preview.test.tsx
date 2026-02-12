// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Preview } from './Preview'

describe('Preview', () => {
  it('renders markdown heading', () => {
    render(<Preview content="# Hello World" />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hello World')
  })

  it('renders bold text', () => {
    render(<Preview content="**bold text**" />)
    expect(screen.getByText('bold text')).toBeInTheDocument()
  })

  it('renders GFM tables', () => {
    const table = '| Name | Value |\n| --- | --- |\n| a | 1 |'
    render(<Preview content={table} />)
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('renders empty content without error', () => {
    const { container } = render(<Preview content="" />)
    expect(container.querySelector('.markdown-body')).toBeInTheDocument()
  })

  it('renders links', () => {
    render(<Preview content="[Click here](https://example.com)" />)
    const link = screen.getByRole('link', { name: 'Click here' })
    expect(link).toHaveAttribute('href', 'https://example.com')
  })

  it('renders code blocks', () => {
    render(<Preview content={'```js\nconsole.log("hi")\n```'} />)
    expect(screen.getByText('console.log("hi")')).toBeInTheDocument()
  })
})
