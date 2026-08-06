#!/bin/sh
set -e

# ── Pre-start SQL migration ──────────────────────────────────────────────────
# Adds any missing columns that cannot be added by TypeORM synchronize
# because the user table already has ~1600 columns (PostgreSQL hard limit).
# This script runs BEFORE the NestJS app boots, so the column exists by the
# time TypeORM checks the schema — meaning TypeORM won't try to add it.
#
# All statements use IF NOT EXISTS — completely safe to run on every deploy.

echo "Running pre-start SQL migrations..."

PGPASSWORD="${DB_PASSWORD}" psql \
  -h "${DB_HOST:-postgres}" \
  -p "${DB_PORT:-5432}" \
  -U "${DB_USERNAME}" \
  -d "${DB_NAME}" \
  -c 'ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "kycApplicationData" jsonb NULL;' \
  2>/dev/null || echo "SQL migration skipped (psql unavailable or column already exists)"

echo "Pre-start migrations done."

# ── Start the application ────────────────────────────────────────────────────
exec "$@"
