#!/bin/sh
set -e

# ── Wait for PostgreSQL to be ready ─────────────────────────────────────────
echo "Waiting for PostgreSQL to be ready..."
RETRIES=30
until pg_isready -h "${DB_HOST:-postgres}" -p "${DB_PORT:-5432}" -U "${DB_USERNAME}" -q || [ "$RETRIES" -eq 0 ]; do
  echo "PostgreSQL not ready yet, waiting... ($RETRIES retries left)"
  RETRIES=$((RETRIES - 1))
  sleep 2
done

# ── Pre-start SQL migration ──────────────────────────────────────────────────
# Adds any missing columns before the NestJS app boots.
# TypeORM synchronize is DISABLED (table has ~1600 cols — PostgreSQL hard limit).
# All statements use IF NOT EXISTS — completely safe to run on every deploy.
echo "Running pre-start SQL migrations..."
PGPASSWORD="${DB_PASSWORD}" psql \
  -h "${DB_HOST:-postgres}" \
  -p "${DB_PORT:-5432}" \
  -U "${DB_USERNAME}" \
  -d "${DB_NAME}" \
  -c 'ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "kycApplicationData" jsonb NULL;'

echo "Pre-start migrations done."

# ── Start the application ────────────────────────────────────────────────────
exec "$@"
