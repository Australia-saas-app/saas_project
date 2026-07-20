#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

echo "🚀 Starting Deployment Process..."

# 1. Force pull latest code from GitHub (overwriting any local changes)
echo "📥 Pulling latest code from GitHub..."
git fetch --all
git reset --hard origin/main

# 2. Clean up dangling images to ensure there is enough disk space
echo "🧹 Cleaning up old Docker dangling images..."
docker image prune -f || true

# 3. Start the new containers (and build them one at a time to save RAM)
echo "✅ Building and starting new containers..."
COMPOSE_PARALLEL_LIMIT=1 docker compose up -d --build --remove-orphans

# 5. Clean up unused Docker images to free up disk space
echo "🧹 Cleaning up old images..."
docker image prune -f

echo "🎉 Deployment completely successfully! Your app is now running the latest code."
