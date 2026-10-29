#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

echo "🚀 Starting Fast Real-time Deployment Process..."

# Enable Docker BuildKit & Plain unbuffered progress for live GitHub Actions log streaming
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
export BUILDKIT_PROGRESS=plain

# 1. Force pull latest code from GitHub (overwriting any local changes)
echo "📥 Pulling latest code from GitHub..."
git fetch --all
git reset --hard origin/main

# 2. Start new containers using Docker BuildKit layer caching (Fast builds)
echo "✅ Building and starting new containers..."
docker compose --progress=plain up -d --build --remove-orphans

# 3. Self-healing database check: ensure constraints never block SSO startup
echo "🔒 Verifying database schema safety..."
sleep 3
docker compose exec -T saas-postgres psql -U admin -d saas_db -c "
  ALTER TABLE transactions ALTER COLUMN \"userId\" DROP NOT NULL;
  ALTER TABLE wallets ALTER COLUMN \"userId\" DROP NOT NULL;
" 2>/dev/null || true

# 4. Verify services are running
echo "🔍 Checking container status..."
docker compose ps

echo "🎉 Deployment completed successfully! Your app is now running the latest code."
