import { test, expect } from '@playwright/test'
import {
  createTestDocument,
  waitForEditorReady,
  typeInEditor,
  getEditorContent,
} from '../helpers/documents'

test('Collaboration: text typed in window A appears in window B', async ({
  browser,
}) => {
  const context1 = await browser.newContext()
  const page1 = await context1.newPage()
  const docId = await createTestDocument(page1)
  await waitForEditorReady(page1)

  const context2 = await browser.newContext()
  const page2 = await context2.newPage()
  await page2.goto(`/${docId}`)
  await waitForEditorReady(page2)

  // Type in window A
  await typeInEditor(page1, 'Hello from window A')

  // Verify it appears in window B
  await expect
    .poll(() => getEditorContent(page2), {
      message: 'Text typed in A should appear in B',
      timeout: 10000,
    })
    .toContain('Hello from window A')

  await context1.close()
  await context2.close()
})

test('Collaboration: text typed in window B appears in window A', async ({
  browser,
}) => {
  const context1 = await browser.newContext()
  const page1 = await context1.newPage()
  const docId = await createTestDocument(page1)
  await waitForEditorReady(page1)

  const context2 = await browser.newContext()
  const page2 = await context2.newPage()
  await page2.goto(`/${docId}`)
  await waitForEditorReady(page2)

  // Type in window B
  await typeInEditor(page2, 'Hello from window B')

  // Verify it appears in window A
  await expect
    .poll(() => getEditorContent(page1), {
      message: 'Text typed in B should appear in A',
      timeout: 10000,
    })
    .toContain('Hello from window B')

  await context1.close()
  await context2.close()
})

test('Collaboration: bidirectional sync', async ({ browser }) => {
  const context1 = await browser.newContext()
  const page1 = await context1.newPage()
  const docId = await createTestDocument(page1)
  await waitForEditorReady(page1)

  const context2 = await browser.newContext()
  const page2 = await context2.newPage()
  await page2.goto(`/${docId}`)
  await waitForEditorReady(page2)

  // Type in A first
  await typeInEditor(page1, 'Line from A')

  // Wait for B to receive it
  await expect
    .poll(() => getEditorContent(page2), { timeout: 10000 })
    .toContain('Line from A')

  // Now type in B (click to move cursor to end)
  await typeInEditor(page2, '\nLine from B')

  // Verify A sees both lines
  await expect
    .poll(() => getEditorContent(page1), {
      message: 'A should see text from both windows',
      timeout: 10000,
    })
    .toContain('Line from B')

  await context1.close()
  await context2.close()
})

test('Collaboration: document persists after all clients disconnect', async ({
  browser,
}) => {
  // Create doc and type text
  const context1 = await browser.newContext()
  const page1 = await context1.newPage()
  const docId = await createTestDocument(page1)
  await waitForEditorReady(page1)

  await typeInEditor(page1, 'Persisted text')

  // Wait for text to be in the editor (confirms typing worked)
  await expect
    .poll(() => getEditorContent(page1), { timeout: 5000 })
    .toContain('Persisted text')

  // Give the server a moment to persist the Yjs state
  await page1.waitForTimeout(1000)

  // Close the client
  await context1.close()

  // Reopen in a fresh context
  const context2 = await browser.newContext()
  const page2 = await context2.newPage()
  await page2.goto(`/${docId}`)
  await waitForEditorReady(page2)

  // Content should still be there
  await expect
    .poll(() => getEditorContent(page2), {
      message: 'Document content should persist after reconnect',
      timeout: 10000,
    })
    .toContain('Persisted text')

  await context2.close()
})

test('Collaboration: document survives page reload', async ({ page }) => {
  const docId = await createTestDocument(page)
  await waitForEditorReady(page)

  await typeInEditor(page, 'Before reload')

  await expect
    .poll(() => getEditorContent(page), { timeout: 5000 })
    .toContain('Before reload')

  // Give server time to persist
  await page.waitForTimeout(1000)

  await page.reload()
  await waitForEditorReady(page)

  await expect
    .poll(() => getEditorContent(page), {
      message: 'Content should survive page reload',
      timeout: 10000,
    })
    .toContain('Before reload')
})

test('Collaboration: both clients see the editor and preview', async ({
  browser,
}) => {
  const context1 = await browser.newContext()
  const page1 = await context1.newPage()
  const docId = await createTestDocument(page1)
  await waitForEditorReady(page1)

  const context2 = await browser.newContext()
  const page2 = await context2.newPage()
  await page2.goto(`/${docId}`)
  await waitForEditorReady(page2)

  // Both should have editor and preview
  await expect(page1.locator('.cm-editor')).toBeVisible()
  await expect(page2.locator('.cm-editor')).toBeVisible()
  await expect(page1.locator('.markdown-body')).toBeVisible()
  await expect(page2.locator('.markdown-body')).toBeVisible()

  await context1.close()
  await context2.close()
})
