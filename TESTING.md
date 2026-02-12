# Testing Guide

This project uses **two types of tests** to ensure reliability:

1. **Unit Tests** (Vitest) — Test individual components and functions in isolation
2. **Integration Tests** (Playwright) — Test end-to-end functionality with a real browser

## Quick Start

```bash
# Run unit tests only
npm test

# Run integration tests only
npm run test:integration

# Run ALL tests (unit + integration)
npm run test:all

# Run integration tests with interactive UI (debug mode)
npm run test:integration:ui

# Run tests in watch mode (re-runs on file changes)
npm run test:watch
```

## Unit Tests (Vitest)

**Location:** `src/**/*.test.ts` and `src/**/*.test.tsx`

Unit tests verify that individual components and utilities work correctly in isolation.

### Running Unit Tests

```bash
npm test                          # Run all unit tests once
npm run test:watch                # Watch mode (auto re-run)
npm test -- src/lib/id.test.ts    # Run a specific test file
```

### Test Coverage

- `src/lib/id.test.ts` — Document ID generation (3 tests)
- `src/lib/db.test.ts` — SQLite database operations (8 tests)
- `src/lib/yjs.test.ts` — Yjs document creation (3 tests)
- `src/components/EditorPage.test.tsx` — Editor UI component (7 tests)
- `src/components/Preview.test.tsx` — Markdown preview rendering (6 tests)

**Total: 27 unit tests**

## Integration Tests (Playwright)

**Location:** `tests/e2e/*.spec.ts`

Integration tests run the full application with a real browser (Chromium) and verify end-to-end functionality. These tests are slower but more comprehensive.

### Running Integration Tests

```bash
npm run test:integration                 # Run all integration tests
npm run test:integration:ui              # Interactive UI mode (helpful for debugging)
npm run test:integration -- --headed     # Show browser window while testing
```

### Test Structure

Tests are organized by feature:

#### `tests/e2e/homepage.spec.ts` (4 tests)
- Auto-redirect from homepage to new document
- Each visit creates a unique document
- Editor and preview are visible
- Split pane layout is correct

#### `tests/e2e/upload.spec.ts` (8 tests)
- Upload button is visible and clickable
- File picker opens with correct file restrictions (`.md`, `.markdown`, `.txt`)
- Drag-and-drop overlay appears/disappears on drag events
- Upload button state management

#### `tests/e2e/collaboration.spec.ts` (6 tests)
- Multiple clients can connect to the same document
- Both clients have access to editor and preview
- Document persists across multiple tabs
- Document survives page reload
- URL remains stable during navigation

**Total: 18 integration tests**

### Test Database

Integration tests use an **in-memory SQLite database** (`:memory:`) to avoid file creation. This is configured in `playwright.config.ts`:

```typescript
webServer: {
  command: 'DATABASE_PATH=:memory: npm run dev',
  // ...
}
```

Each test run starts with a clean, empty database.

## Running Tests Locally

### Development Workflow

```bash
# 1. Start dev server (in one terminal)
npm run dev

# 2. In another terminal, run tests
npm run test:watch              # Watch unit tests
npm run test:integration:ui     # Interactive integration tests

# 3. Make changes to code
# Tests automatically re-run on file changes
```

### Before Committing

```bash
npm run test:all               # Run all tests to ensure nothing broke
npm run build                  # Verify production build works
```

## GitHub Actions CI Pipeline

The project has automated testing in GitHub Actions. Every push and pull request runs:

1. **Unit tests** (Vitest)
2. **Integration tests** (Playwright with in-memory database)

### Pipeline Configuration

File: `.github/workflows/test.yml`

- Runs on: `main` branch and all `feature/*` branches
- Triggers: Push and Pull Request events
- Jobs:
  - `unit-tests` — Runs Vitest (fast, ~1 minute)
  - `integration-tests` — Runs Playwright with browser (~5 minutes)

### Viewing Results

1. Go to your PR on GitHub
2. Scroll to "Checks" section
3. Click "Details" next to failing test
4. View logs and screenshots (Playwright automatically captures screenshots on failure)

### Artifacts

If tests fail, GitHub Actions uploads:
- `playwright-report/` — Interactive HTML report (view in browser)
- `test-results/` — Raw test result data with screenshots

Download and open `playwright-report/index.html` to see detailed failure information.

## Writing New Tests

### Unit Test Example

```typescript
// src/lib/my-function.test.ts
import { describe, it, expect } from 'vitest'
import { myFunction } from './my-function'

describe('myFunction', () => {
  it('returns expected value', () => {
    expect(myFunction(5)).toBe(10)
  })

  it('handles edge cases', () => {
    expect(myFunction(0)).toBe(0)
  })
})
```

### Integration Test Example

```typescript
// tests/e2e/my-feature.spec.ts
import { test, expect } from '@playwright/test'
import { createTestDocument, waitForEditorReady } from '../helpers/documents'

test.describe('My Feature', () => {
  test('does something', async ({ page }) => {
    // Create a new document
    const docId = await createTestDocument(page)
    await waitForEditorReady(page)

    // Check something on the page
    expect(page.url()).toContain(`/${docId}`)
  })
})
```

### Helper Functions

Common integration test utilities in `tests/helpers/documents.ts`:

```typescript
createTestDocument(page)      // Create new doc, returns ID
waitForEditorReady(page)      // Wait for CodeMirror to load
getEditorContent(page)        // Get current editor text
typeInEditor(page, text)      // Type text in editor
uploadFile(page, name, content) // Upload a file
dragDropFile(page, name, content) // Simulate drag-and-drop
```

## Debugging Failed Tests

### Unit Test Failures

```bash
npm test -- src/lib/id.test.ts    # Run specific test
npm run test:watch                 # Watch mode for iterative debugging
```

### Integration Test Failures

```bash
# Run single test with browser visible
npm run test:integration -- --headed tests/e2e/homepage.spec.ts

# Interactive debug mode
npm run test:integration:ui
```

In interactive mode, you can:
- Pause execution at any point
- Inspect the page state
- Step through actions one by one
- See live browser updates

### Viewing Test Reports

```bash
# After tests run, open the interactive report
open playwright-report/index.html
```

## Common Issues

### "Could not extract document ID from URL"
- The regex pattern doesn't match the URL format
- Check that the server is running and redirecting correctly
- Verify `DATABASE_PATH=:memory:` is set

### "Element not found" in drag-and-drop tests
- Some drag-and-drop events are simulated and may not fully trigger browser events
- Consider testing the UI state instead of the full flow

### "Timeout waiting for element"
- Element hasn't loaded yet (increase timeout)
- Element is not visible (check CSS, z-index, display)
- Wrong selector (check in browser DevTools)

## Performance

- **Unit tests**: ~1 second (27 tests)
- **Integration tests**: ~25 seconds (18 tests, includes browser startup)
- **Total (test:all)**: ~30 seconds

Integration tests are sequential (1 worker) to avoid SQLite locking issues with in-memory database.

## Continuous Integration Best Practices

✅ **Do:**
- Write tests for new features
- Run tests before pushing (`npm run test:all`)
- Review CI logs on failed builds
- Fix flaky tests immediately

❌ **Don't:**
- Commit without running tests locally first
- Ignore CI failures
- Skip tests for "just tweaks"

## References

- **Vitest Docs:** https://vitest.dev
- **Playwright Docs:** https://playwright.dev
- **Testing Library Docs:** https://testing-library.com
