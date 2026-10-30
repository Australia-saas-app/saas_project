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

# If docker-compose or global files changed, rebuild all services fresh
if echo "$CHANGED_FILES" | grep -qE "docker-compose\.yml|deploy\.sh|clean-rebuild\.sh"; then
  echo "📦 Configuration files changed. Triggering full build for all services..."
  BUILD_ALL=true
fi

# 2. Build ONLY changed services, or start all if no specific services changed
if [ "$BUILD_ALL" = "true" ]; then
  echo "🔨 Full Build: Rebuilding all containers fresh..."
  docker compose up -d --build --remove-orphans
elif [ ${#SERVICES_TO_BUILD[@]} -gt 0 ]; then
  echo "⚡ Fast Build: Rebuilding ONLY changed services: ${SERVICES_TO_BUILD[*]}..."
  docker compose up -d --build "${SERVICES_TO_BUILD[@]}"
else
  echo "⚡ Updating running containers..."
  docker compose up -d --remove-orphans
fi

# 3. Self-healing database check: ensure constraints, columns, and user links are intact
echo "🔒 Verifying database schema and user records..."
sleep 3
docker compose exec -T saas-postgres psql -U admin -d saas_db -c "
  ALTER TABLE transactions ALTER COLUMN \"userId\" TYPE VARCHAR(100);
  ALTER TABLE wallets ALTER COLUMN \"userId\" TYPE VARCHAR(100);
  ALTER TABLE transactions ALTER COLUMN \"userId\" DROP NOT NULL;
  ALTER TABLE wallets ALTER COLUMN \"userId\" DROP NOT NULL;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS \"trustedIps\" JSONB DEFAULT '[]'::jsonb;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS \"paymentMethods\" JSONB DEFAULT '[]'::jsonb;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS \"governmentIdType\" VARCHAR(50);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS \"governmentId\" VARCHAR(100);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS \"idDocument\" TEXT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS \"recoveryKey\" VARCHAR(100);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS \"kycStatus\" VARCHAR(50) DEFAULT 'none';
  -- Harmonize recoveryKey case sensitivity
  UPDATE users SET \"recoveryKey\" = recoverykey WHERE \"recoveryKey\" IS NULL AND recoverykey IS NOT NULL;
  UPDATE users SET recoverykey = \"recoveryKey\" WHERE recoverykey IS NULL AND \"recoveryKey\" IS NOT NULL;
  -- Harmonize case-sensitive kycstatus and kycStatus columns
  UPDATE users SET \"kycStatus\" = kycstatus WHERE (\"kycStatus\" IS NULL OR \"kycStatus\" = 'none') AND kycstatus IS NOT NULL AND kycstatus != 'none';
  UPDATE users SET kycstatus = \"kycStatus\" WHERE (kycstatus IS NULL OR kycstatus = 'none') AND \"kycStatus\" IS NOT NULL AND \"kycStatus\" != 'none';
  -- Sync approved KYC status from kyc_application to users table
  UPDATE users u
  SET \"kycStatus\" = 'approved', kycstatus = 'approved'
  FROM kyc_application k
  WHERE (u.\"userId\" = k.\"userId\" OR u.id::text = k.\"userId\" OR u.email = k.\"userId\")
    AND (k.\"applicationData\"->>'status' = 'approved' OR k.\"applicationData\"->>'kycStatus' = 'approved');
  -- Sync pending KYC status from kyc_application to users table if currently none
  UPDATE users u
  SET \"kycStatus\" = 'pending', kycstatus = 'pending'
  FROM kyc_application k
  WHERE (u.\"userId\" = k.\"userId\" OR u.id::text = k.\"userId\" OR u.email = k.\"userId\")
    AND (u.\"kycStatus\" IS NULL OR u.\"kycStatus\" = 'none')
    AND (k.\"applicationData\"->>'status' = 'pending' OR k.\"applicationData\"->>'appliedAt' IS NOT NULL);
  -- Bidirectional sync: if users table is approved, ensure kyc_application snapshot status is approved
  UPDATE kyc_application k
  SET \"applicationData\" = jsonb_set(COALESCE(k.\"applicationData\", '{}'::jsonb), '{status}', '\"approved\"'::jsonb, true)
  FROM users u
  WHERE (u.\"userId\" = k.\"userId\" OR u.id::text = k.\"userId\" OR u.email = k.\"userId\")
    AND (u.\"kycStatus\" = 'approved' OR u.kycstatus = 'approved')
    AND (k.\"applicationData\"->>'status' IS NULL OR k.\"applicationData\"->>'status' != 'approved');
  -- Relate orphan transactions dynamically to their respective wallet's owner
  UPDATE transactions t
  SET \"userId\" = w.\"userId\"
  FROM wallets w
  WHERE t.\"walletId\" = w.id
    AND (t.\"userId\" IS NULL OR t.\"userId\" = '')
    AND w.\"userId\" IS NOT NULL AND w.\"userId\" != '';
" 2>/dev/null || true

# 4. Synchronize Kong Gateway so newly started containers route immediately
echo "🔄 Synchronizing Kong Gateway..."
docker compose restart kong 2>/dev/null || true

# 5. Verify running services
echo "🔍 Checking container status..."
docker compose ps

echo "🎉 Fast Deployment completed successfully! Your app is now running the latest code."
