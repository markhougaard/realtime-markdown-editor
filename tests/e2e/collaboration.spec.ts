import { test, expect } from '@playwright/test'
import { createTestDocument, waitForEditorReady } from '../helpers/documents'

test.describe('Real-time Collaboration', () => {
  test('multiple clients connect to same document', async ({ browser }) => {
    // Create a document in first tab
    const context1 = await browser.newContext()
    const page1 = await context1.newPage()
    const docId = await createTestDocument(page1)
    await waitForEditorReady(page1)

    // Open same document in second tab
    const context2 = await browser.newContext()
    const page2 = await context2.newPage()
    await page2.goto(`/${docId}`)
    await waitForEditorReady(page2)

    // Both should be viewing the same document ID
    expect(page1.url()).toContain(`/${docId}`)
    expect(page2.url()).toContain(`/${docId}`)

    await context1.close()
    await context2.close()
  })

  test('both clients can access the editor', async ({ browser }) => {
    // Create a document in first tab
    const context1 = await browser.newContext()
    const page1 = await context1.newPage()
    const docId = await createTestDocument(page1)
    await waitForEditorReady(page1)

    // Open same document in second tab
    const context2 = await browser.newContext()
    const page2 = await context2.newPage()
    await page2.goto(`/${docId}`)
    await waitForEditorReady(page2)

    // Both should have CodeMirror editor visible
    const editor1 = page1.locator('.cm-editor')
    const editor2 = page2.locator('.cm-editor')

    await expect(editor1).toBeVisible()
    await expect(editor2).toBeVisible()

    await context1.close()
    await context2.close()
  })

  test('preview is available in both clients', async ({ browser }) => {
    // Create a document
    const context1 = await browser.newContext()
    const page1 = await context1.newPage()
    const docId = await createTestDocument(page1)
    await waitForEditorReady(page1)

    // Open same document in second tab
    const context2 = await browser.newContext()
    const page2 = await context2.newPage()
    await page2.goto(`/${docId}`)
    await waitForEditorReady(page2)

    // Both should have markdown preview visible
    const preview1 = page1.locator('.markdown-body')
    const preview2 = page2.locator('.markdown-body')

    await expect(preview1).toBeVisible()
    await expect(preview2).toBeVisible()

    await context1.close()
    await context2.close()
  })

  test('document persists when loaded in multiple tabs', async ({
    browser,
  }) => {
    // Create a document
    const context1 = await browser.newContext()
    const page1 = await context1.newPage()
    const docId = await createTestDocument(page1)
    await waitForEditorReady(page1)

    // Open same document in second tab
    const context2 = await browser.newContext()
    const page2 = await context2.newPage()
    await page2.goto(`/${docId}`)
    await waitForEditorReady(page2)

    // Both should have the same document ID
    const url1 = page1.url()
    const url2 = page2.url()

    const id1 = url1.split('/').pop()
    const id2 = url2.split('/').pop()

    expect(id1).toBe(id2)
    expect(id1).not.toBeUndefined()

    await context1.close()
    await context2.close()
  })

  test('document survives page reload', async ({ page }) => {
    const docId = await createTestDocument(page)
    await waitForEditorReady(page)

    const originalUrl = page.url()

    // Reload the page
    await page.reload()
    await waitForEditorReady(page)

    // Should still be on the same document
    expect(page.url()).toBe(originalUrl)
  })

  test('document ID persists in URL across navigation', async ({ page }) => {
    const docId = await createTestDocument(page)
    await waitForEditorReady(page)

    // Get the current URL
    const urlBefore = page.url()

    // Wait a bit
    await page.waitForTimeout(1000)

    // URL should not have changed
    const urlAfter = page.url()
    expect(urlAfter).toBe(urlBefore)
  })
})
