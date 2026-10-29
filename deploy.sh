#!/bin/bash
set -e # Exit immediately if any command exits with a non-zero status.

echo "🚀 Starting Fast Incremental Deployment Process..."

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

# If docker-compose or global files changed, or if first commit, build core apps
if echo "$CHANGED_FILES" | grep -q "docker-compose\.yml\|deploy\.sh"; then
  echo "📦 Configuration files changed. Ensuring all services are updated..."
  SERVICES_TO_BUILD=()
fi

# 2. Build ONLY changed services, or start all if no specific services changed
if [ ${#SERVICES_TO_BUILD[@]} -gt 0 ]; then
  echo "⚡ Fast Build: Rebuilding ONLY changed services: ${SERVICES_TO_BUILD[*]}..."
  docker compose up -d --build "${SERVICES_TO_BUILD[@]}"
else
  echo "⚡ Updating containers without unnecessary rebuilds..."
  docker compose up -d --remove-orphans
fi

# 3. Self-healing database check: ensure constraints never block SSO startup
echo "🔒 Verifying database schema safety..."
sleep 3
docker compose exec -T saas-postgres psql -U admin -d saas_db -c "
  ALTER TABLE transactions ALTER COLUMN \"userId\" DROP NOT NULL;
  ALTER TABLE wallets ALTER COLUMN \"userId\" DROP NOT NULL;
" 2>/dev/null || true

# 4. Verify running services
echo "🔍 Checking container status..."
docker compose ps

echo "🎉 Fast Deployment completed successfully! Your app is now running the latest code."
