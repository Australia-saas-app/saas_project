#!/bin/bash
set -e # Exit immediately if any command exits with a non-zero status.

echo "=========================================================="
echo "🚀 Starting Fast Incremental Deployment Process..."
echo "=========================================================="

# Enable Docker BuildKit & Plain unbuffered progress
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
export BUILDKIT_PROGRESS=plain

# 1. Fetch latest changes from GitHub and determine what changed
echo "📥 Checking for changes from GitHub..."
git fetch origin main
OLD_COMMIT=$(git rev-parse HEAD)
git reset --hard origin/main
NEW_COMMIT=$(git rev-parse HEAD)

CHANGED_FILES=$(git diff --name-only "$OLD_COMMIT" "$NEW_COMMIT" 2>/dev/null || true)
if [ -z "$CHANGED_FILES" ] || [ "$OLD_COMMIT" = "$NEW_COMMIT" ]; then
  # If already reset or no diff between old and new, check files modified in the latest commit
  CHANGED_FILES=$(git diff --name-only HEAD~1 HEAD 2>/dev/null || true)
fi

SERVICES_TO_BUILD=()

# Detect modified services
if echo "$CHANGED_FILES" | grep -q "^frontend/"; then
  SERVICES_TO_BUILD+=("saas-frontend")
fi

if echo "$CHANGED_FILES" | grep -q "^admin/"; then
  SERVICES_TO_BUILD+=("saas-admin")
fi

if echo "$CHANGED_FILES" | grep -q "^backend/apps/sso/"; then
  SERVICES_TO_BUILD+=("saas-backend-sso")
fi

if echo "$CHANGED_FILES" | grep -q "^backend/apps/admin/"; then
  SERVICES_TO_BUILD+=("saas-backend-admin")
fi

if echo "$CHANGED_FILES" | grep -q "^backend/apps/payment/"; then
  SERVICES_TO_BUILD+=("saas-backend-payment")
fi

if echo "$CHANGED_FILES" | grep -q "^backend/apps/platform/"; then
  SERVICES_TO_BUILD+=("saas-backend-platform")
fi

if echo "$CHANGED_FILES" | grep -q "^backend/apps/technology/"; then
  SERVICES_TO_BUILD+=("saas-backend-technology")
fi

if echo "$CHANGED_FILES" | grep -q "^backend/apps/investment/"; then
  SERVICES_TO_BUILD+=("saas-backend-investment")
fi

if echo "$CHANGED_FILES" | grep -q "^backend/apps/notification/"; then
  SERVICES_TO_BUILD+=("saas-backend-notification")
fi

if echo "$CHANGED_FILES" | grep -q "^backend/apps/user-profile/"; then
  SERVICES_TO_BUILD+=("saas-backend-user-profile")
fi

BUILD_ALL=false

# Rebuild all services ONLY if docker-compose configuration itself changed
if echo "$CHANGED_FILES" | grep -qE "^docker-compose\.yml"; then
  echo "📦 docker-compose.yml changed. Triggering full build for all services..."
  BUILD_ALL=true
fi

# 2. Build ONLY changed services, or fast update if no service code changed
if [ "$BUILD_ALL" = "true" ]; then
  echo "🔨 Full Build: Rebuilding all containers fresh..."
  docker compose up -d --build --remove-orphans
elif [ ${#SERVICES_TO_BUILD[@]} -gt 0 ]; then
  echo "⚡ Fast Build: Rebuilding ONLY changed services: ${SERVICES_TO_BUILD[*]}..."
  docker compose up -d --build "${SERVICES_TO_BUILD[@]}"
else
  echo "⚡ No container source code changed. Updating running containers..."
  docker compose up -d --remove-orphans
fi

# 3. Free up server disk space by purging dangling build layers and superseded images
echo "🧹 Reclaiming server disk space..."
docker image prune -f 2>/dev/null || true
docker builder prune -f --filter "until=24h" 2>/dev/null || true

# 4. Synchronize Kong Gateway so newly started containers route immediately
echo "🔄 Synchronizing Kong Gateway..."
docker compose restart kong 2>/dev/null || true

# 5. Verify running services
echo "🔍 Checking container status..."
docker compose ps

echo "=========================================================="
echo "🎉 Fast Deployment completed successfully!"
echo "ℹ️  Server disk space reclaimed. Database preserved 100%."
echo "ℹ️  Run ./heal-schema.sh if you need to run schema diagnostics."
echo "=========================================================="
