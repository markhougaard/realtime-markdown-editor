#!/usr/bin/env bash
# =============================================================================
# server-deploy.sh — runs on the server, as `mark`, for every CI deploy.
# =============================================================================
# The CI deploy key in ~mark/.ssh/authorized_keys is restricted to this script:
#   command="/opt/multisite/apps/markdown/deploy/server-deploy.sh",restrict ssh-ed25519 … markdown-ci-deploy
# so whatever command the workflow sends is ignored and this runs instead.
# The key can deploy this app and do nothing else.
#
# The image is built for linux/arm64 by .github/workflows/deploy.yml (the server
# is an arm64 Hetzner box) and pulled from ghcr.io, which is public.
# =============================================================================
set -euo pipefail

cd /opt/multisite/apps/markdown

echo "Pulling config (docker-compose.yml, this script)..."
git pull --ff-only origin main

echo "Pulling image..."
docker compose pull app

echo "Starting..."
docker compose up -d --remove-orphans

echo "Waiting for the container healthcheck..."
for _ in $(seq 1 30); do
  status=$(docker inspect -f '{{.State.Health.Status}}' markdown-app 2>/dev/null || echo missing)
  if [ "$status" = healthy ]; then
    echo "Healthy."
    docker compose ps
    exit 0
  fi
  sleep 5
done

echo "Not healthy after 150 s (last status: $status)." >&2
docker compose logs --tail 50 app >&2
exit 1
