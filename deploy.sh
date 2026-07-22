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

# 2. Ensure docker socket permissions
sudo chmod 666 /var/run/docker.sock || true

# 3. Start new containers using Docker BuildKit layer caching (Fast 1-2 min builds)
echo "✅ Building and starting new containers..."
sudo docker compose --progress=plain up -d --build --remove-orphans

# 4. Clean up dangling unused images after build completes to free up disk space
echo "🧹 Cleaning up old images..."
sudo docker image prune -f || true

echo "🎉 Deployment completed successfully! Your app is now running the latest code."
