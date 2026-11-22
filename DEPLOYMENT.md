# Deployment

The app is one container: a Node.js server (`server.ts`) that serves Next.js and the
y-websocket server on the same port, with documents in a SQLite file. Anything that can
run a Docker image and put a TLS reverse proxy in front of it can host it.

## Running it with Docker

```bash
docker network create web                 # once
docker volume create markdown_markdown_data   # once
DEPLOY_TAG=local docker compose -p markdown up -d --build
```

`compose.yml` is the production definition. `DEPLOY_TAG` names the image
(`markdown-app:<tag>`); the server's deploy runner sets it to the commit's short sha,
and any value works by hand.

| Setting | Default | Notes |
|---|---|---|
| `PORT` | `3000` | HTTP and WebSocket on the same port |
| `DATABASE_PATH` | `./data/documents.db` | `compose.yml` sets `/app/data/documents.db` |
| `NODE_ENV` | | `production` in `compose.yml` |

- **Data:** the external volume `markdown_markdown_data` holds the database. Create it
  once before the first start (`docker volume create markdown_markdown_data`); compose
  refuses to start without it rather than quietly creating an empty one.
- **Health:** `GET /api/health` returns 200 and touches no data. The compose healthcheck
  uses it.
- **Network:** `compose.yml` joins an external Docker network called `web` and publishes no
  port; the reverse proxy on that network reaches it as `markdown-app:3000`.
- **Architecture:** the image builds natively on amd64 and arm64. Build it on the machine
  that runs it, or for its platform.

## Reverse proxy

Any proxy that passes WebSocket upgrades works. With Caddy:

```caddyfile
your-domain.example {
    reverse_proxy markdown-app:3000
}
```

- WebSockets need no extra config. Don't add upgrade headers or separate `ws://` routes.
- Set `Content-Security-Policy` in `next.config.ts` only, never also in the proxy: the
  browser enforces both, and the stricter one breaks hydration.

## Backups

The database runs in WAL mode, so copying `documents.db` alone while the app runs can give
an inconsistent copy. Use SQLite's online backup from inside the container:

```bash
docker exec markdown-app node -e "
  const D = require('better-sqlite3');
  new D('/app/data/documents.db', { readonly: true })
    .backup('/tmp/documents-backup.db').then(() => console.log('ok'))"
docker cp markdown-app:/tmp/documents-backup.db ./documents-$(date +%F).db
docker exec markdown-app rm /tmp/documents-backup.db
```

## How realtimemarkdown.com is deployed

By `git push`, built and tested on the server itself. GitHub runs only `test.yml`.

1. `origin` has two push URLs: GitHub, and a bare repo on the server.
2. The server's push hook queues a deploy, which checks the commit out and runs
   `ci/test` in the image named in `deploy.env` (`TEST_IMAGE`, a Playwright image whose
   version must match `@playwright/test` in `package-lock.json`): `npm ci`, unit tests,
   then Playwright with an in-memory database.
3. It builds `compose.yml` (`markdown-app:<sha>`) and runs
   `docker compose -p markdown up -d --wait` with `HEALTH_TIMEOUT` from `deploy.env`.
4. If the container isn't healthy in time, the previous version is started again. The last
   three versions are kept.

A failing test or build leaves the live version untouched.
