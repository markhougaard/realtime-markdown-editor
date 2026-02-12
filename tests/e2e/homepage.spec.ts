import { test, expect } from '@playwright/test'
import { createTestDocument, waitForEditorReady } from '../helpers/documents'

test.describe('Homepage', () => {
  test('auto-redirects to new document', async ({ page }) => {
    // Visit homepage
    await page.goto('/')

    // Should be redirected to a document like /abc123xyz
    expect(page.url()).toMatch(/\/[a-zA-Z0-9_-]{10}$/)

    // Editor should be loaded
    await waitForEditorReady(page)
    expect(page.locator('.cm-editor')).toBeVisible()
  })

  test('each visit creates a new document', async ({ page }) => {
    // Visit homepage first time
    await page.goto('/')
    const firstUrl = page.url()
    const firstDocId = firstUrl.split('/').pop()

    // Visit homepage again
    await page.goto('/')
    const secondUrl = page.url()
    const secondDocId = secondUrl.split('/').pop()

    // Should be different documents
    expect(firstDocId).not.toBe(secondDocId)
    expect(page.url()).toMatch(/\/[a-zA-Z0-9_-]{10}$/)
  })

  test('editor and preview are visible', async ({ page }) => {
    const docId = await createTestDocument(page)
    await waitForEditorReady(page)

    // Check editor is visible (left side)
    const editor = page.locator('.cm-editor')
    expect(editor).toBeVisible()

    // Check preview container exists (right side with markdown-body class from github-markdown-css)
    const preview = page.locator('.markdown-body')
    expect(preview).toBeVisible()
  })

  test('split pane layout is correct', async ({ page }) => {
    await createTestDocument(page)
    await waitForEditorReady(page)

    // Check that we have the split pane structure
    const container = page.locator('div.flex.h-screen')
    expect(container).toHaveCount(1)

    // Both sides should exist
    const leftPane = page.locator('div.w-1\\/2').first()
    const rightPane = page.locator('div.w-1\\/2').last()

    expect(leftPane).toBeVisible()
    expect(rightPane).toBeVisible()
  })
})
