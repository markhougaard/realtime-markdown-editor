import { Page } from '@playwright/test'

/**
 * Create a test document by visiting homepage
 * Returns the document ID from the redirected URL
 */
export async function createTestDocument(page: Page): Promise<string> {
  await page.goto('/')
  // Homepage redirects to /:id
  const url = page.url()
  const match = url.match(/\/([a-zA-Z0-9_-]+)$/)
  if (!match) {
    throw new Error(`Could not extract document ID from URL: ${url}`)
  }
  return match[1]
}

/**
 * Wait for editor to be ready (CodeMirror loaded)
 */
export async function waitForEditorReady(page: Page): Promise<void> {
  // Wait for the editor container to be visible
  // CodeMirror creates a div with class 'cm-editor'
  await page.waitForSelector('.cm-editor', { timeout: 10000 })
}

/**
 * Get the editor content via JavaScript evaluation
 */
export async function getEditorContent(page: Page): Promise<string> {
  await waitForEditorReady(page)
  const content = await page.evaluate(() => {
    // Access CodeMirror's state through the view
    const element = document.querySelector('.cm-editor') as any
    if (!element?.cmView?.state?.doc) {
      return ''
    }
    return element.cmView.state.doc.toString()
  })
  return content
}

/**
 * Type text into the editor
 */
export async function typeInEditor(page: Page, text: string): Promise<void> {
  await waitForEditorReady(page)
  const editor = page.locator('.cm-editor').first()
  await editor.click()
  // Type text character by character (CodeMirror handles it via keypress)
  await page.keyboard.type(text, { delay: 10 })
}

/**
 * Upload a file using the upload button
 */
export async function uploadFile(
  page: Page,
  filename: string,
  content: string
): Promise<string> {
  // Set the file via the hidden input
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles({
    name: filename,
    mimeType: 'text/plain',
    buffer: Buffer.from(content),
  })

  // Wait for navigation to new document
  await page.waitForURL(/\/[a-zA-Z0-9_-]+$/, { timeout: 10000 })

  const url = page.url()
  const match = url.match(/\/([a-zA-Z0-9_-]+)$/)
  if (!match) {
    throw new Error(`Could not extract document ID after upload: ${url}`)
  }
  return match[1]
}

/**
 * Drag and drop a file onto the page
 */
export async function dragDropFile(
  page: Page,
  filename: string,
  content: string
): Promise<string> {
  // Create a data transfer object with file
  const fileData = {
    name: filename,
    mimeType: 'text/plain',
    buffer: Buffer.from(content),
  }

  // Simulate drag and drop
  await page.evaluate(
    async ({ filename: fname, buffer }) => {
      const dataTransfer = new DataTransfer()
      const file = new File([new Uint8Array(buffer)], fname, {
        type: 'text/plain',
      })
      dataTransfer.items.add(file)

      const dragEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      })

      document.documentElement.dispatchEvent(dragEvent)
    },
    { filename: filename, buffer: Array.from(Buffer.from(content)) }
  )

  // Wait for navigation to new document
  await page.waitForURL(/\/[a-zA-Z0-9_-]+$/, { timeout: 10000 })

  const url = page.url()
  const match = url.match(/\/([a-zA-Z0-9_-]+)$/)
  if (!match) {
    throw new Error(`Could not extract document ID after drag-drop: ${url}`)
  }
  return match[1]
}
