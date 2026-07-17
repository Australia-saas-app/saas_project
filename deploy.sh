#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

echo "🚀 Starting Deployment Process..."

# 1. Force pull latest code from GitHub (overwriting any local changes)
echo "📥 Pulling latest code from GitHub..."
git fetch --all
git reset --hard origin/main

# 2. Start the new containers (and build them)
echo "✅ Building and starting new containers..."
docker compose up -d --build --remove-orphans

# 5. Clean up unused Docker images to free up disk space
echo "🧹 Cleaning up old images..."
docker image prune -f

echo "🎉 Deployment completely successfully! Your app is now running the latest code."
