# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Manager

This project uses yarn. Do NOT switch to npm or any other package manager unless explicitly asked.

## Project Overview

A real-time collaborative Markdown editor. Users create or upload `.md` files and get a shareable URL. Anyone with the URL can edit the document simultaneously with live sync. Think "Google Docs for Markdown" — minimal, ephemeral-feeling, no auth.

**Live at:** `realtimemarkdown.com`

## Tech Stack

- **Framework:** Next.js (TypeScript, App Router)
- **Editor:** CodeMirror 6 with markdown mode
- **Real-time sync:** Yjs (CRDT) + y-websocket
- **Markdown rendering:** remark with remark-gfm (GitHub-Flavored Markdown / CommonMark)
- **Persistence:** SQLite via better-sqlite3 (Yjs document state stored as binary blobs)
- **Styling:** Tailwind CSS
- **Typeface:** Inter (via `next/font/google`)
- **Testing:** Vitest + React Testing Library

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (Next.js + WebSocket server)
npm run build        # Production build
npm start            # Start production server
npm test             # Run all tests
npm test -- <path>   # Run a single test file
```

## Architecture

### Routes

- `/` — Landing page
- `/new` — Creates a new empty document in SQLite, redirects to `/:id`
- `/upload` — Upload form for an existing `.md` file, creates doc, redirects to `/:id`
- `/:id` — Editor view (split pane: CodeMirror left, rendered preview right)

### Real-time Collaboration

Yjs handles conflict-free merging of concurrent edits via CRDTs. The flow:

1. Client loads `/:id`, connects to the WebSocket server with the document ID as the room name
2. `y-websocket` syncs Yjs document state between all connected clients
3. CodeMirror is bound to the Yjs document via `y-codemirror.next`
4. On each sync, the server persists the Yjs document update to SQLite

### Custom Server

Next.js runs behind a custom Node.js HTTP server (`server.ts`) so that the y-websocket WebSocket server can share the same port. This is critical for simple single-process deployment.

### Persistence Layer

SQLite stores documents in a single table:

- `id` (TEXT PRIMARY KEY) — the short unique URL slug (nanoid)
- `content` (BLOB) — the serialized Yjs document state
- `created_at` (DATETIME)
- `updated_at` (DATETIME)

### Key Design Decisions

- **No authentication.** Anyone with the link can edit.
- **Documents persist indefinitely** (no auto-expiry).
- **Single-process deployment.** One `npm start` runs everything.
- **GFM / CommonMark.** Markdown rendering matches GitHub's spec and visual style.
- **GitHub Gist styling.** The rendered preview should look exactly like a GitHub Gist (font sizes, spacing, code block styling, etc.). Use Inter as the base typeface.

## ⚠️ WebSocket + Next.js + Caddy Integration — DO NOT CHANGE CARELESSLY

This setup took significant iteration to get working correctly. The combination of Next.js, y-websocket, and Caddy has several non-obvious failure modes. The current setup works in production. Treat the following as load-bearing:

### 1. CJS `require('yjs')` in `server.ts` — do not convert to ESM import

```ts
const Y: typeof YTypes = require('yjs')
```

If you use `import * as Y from 'yjs'` instead, Node loads both `yjs.mjs` (ESM) and `yjs.cjs` (CJS) as separate module instances. Yjs detects this and throws `"Yjs was already imported"`, breaking all sync. The `require()` forces the same CJS instance that `y-websocket/bin/utils.cjs` uses internally.

### 2. `serverExternalPackages` in `next.config.ts` — do not remove these packages

```ts
serverExternalPackages: ['better-sqlite3', 'yjs', 'y-websocket', 'y-codemirror.next']
```

This tells Next.js not to bundle these packages. If they get bundled, the dual-module problem (above) re-emerges and SQLite native bindings break.

### 3. The `upgrade` event guard in `server.ts` — do not remove

In production, Next.js lazily registers its own `upgrade` listener on the HTTP server after handling the first HTTP request. When both our listener and Next.js's listener fire for a y-websocket upgrade, Next.js corrupts the already-upgraded socket, causing WebSocket connections to die with **close code 1006**.

The fix (production only — dev needs Next.js's listener for HMR):

```ts
if (!dev) {
  const origAddListener = server.addListener.bind(server)
  const guardedOn = function (event, listener) {
    if (event === 'upgrade') return server   // block any additional upgrade listeners
    return origAddListener(event, listener)
  }
  server.on = server.addListener = guardedOn
}
```

### 4. `hostname: '0.0.0.0'` in production

`server.ts` passes `hostname` to Next.js. In Docker, `process.env.HOSTNAME` is the container ID (not a useful hostname). The code always binds to `0.0.0.0` in production so the server is reachable from outside the container. Do not change this to `localhost`.

### 5. `/_next` path exclusion in the upgrade handler

```ts
if (pathname?.startsWith('/_next')) return
```

This lets Next.js handle its own HMR WebSocket connections in dev. Without this, the y-websocket server intercepts HMR traffic and dev mode breaks.

### 6. Caddy passes WebSocket upgrades transparently

No special Caddy config is needed for WebSockets. `reverse_proxy markdown-app:3000` handles HTTP upgrade headers automatically. Do not add `ws://` proxying, custom upgrade headers, or separate WebSocket route matchers — they are not needed and will likely break things.

### 7. Do NOT set `Content-Security-Policy` in both the Caddyfile and `next.config.ts`

The browser enforces **all** `Content-Security-Policy` headers it receives simultaneously (AND logic — each one further restricts the others). Next.js already sets the correct CSP via `next.config.ts`. If Caddy also sets one (even as a "tailored" override), the browser applies both and the stricter one wins. The Caddy CSP was missing `'unsafe-inline'` on `script-src`, which blocked Next.js's RSC hydration scripts and broke the entire app with "Connection closed" errors. The CSP must live in **one place only** — `next.config.ts`.

## Deployment

- When writing Caddyfile configs, only use directives confirmed in the target Caddy version's docs. Do NOT guess at directives like `rate_limit`, `idle_timeout`, or `encode level`.
- When deploying, verify port configuration, health check endpoints, and networking (IPv4 vs IPv6) before declaring success.

## Testing

- Keep Playwright integration tests and Vitest unit tests in separate directories with distinct configs to prevent cross-contamination.
- After any schema or model change, remind user to clear stale local data (iOS simulator data, SQLite DBs, etc.) before debugging runtime crashes.

## Communication Style

- Be concise during planning phases. Present plans as bullet-point outlines, not lengthy prose. Ask for approval quickly and move to implementation.
- Do not over-explain before acting. When the task is clear, start implementing.

## Conventions

- All code is TypeScript (strict mode).
- Every module must have a corresponding `.test.ts` (or `.test.tsx`) file with unit tests.
- Use existing npm packages over writing custom code wherever possible.
- Prefer named exports.
- Use Tailwind utility classes; avoid custom CSS.
