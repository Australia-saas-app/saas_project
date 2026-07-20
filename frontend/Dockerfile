# syntax=docker/dockerfile:1
#
# Web app image for Cloud Run / container hosting.
#
#   docker build -t system-db-web .

FROM node:20-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# ─── Build application ────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

ARG APP_DIR=web
ARG FILTER_PACKAGE=system-db

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json ./apps/web/

RUN npx pnpm install --frozen-lockfile

COPY apps/${APP_DIR} ./apps/${APP_DIR}
COPY modules ./modules
COPY shared ./shared
COPY services ./services



RUN mkdir -p apps/${APP_DIR}/public

ARG NEXT_PUBLIC_BACKEND_URL=http://localhost:3006
ARG NEXT_PUBLIC_APP_NAME=System DB
ARG NEXT_PUBLIC_APP_ENV=production
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_ADMIN_URL=http://localhost:3001

ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_APP_ENV=$NEXT_PUBLIC_APP_ENV
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_ADMIN_URL=$NEXT_PUBLIC_ADMIN_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV CI=true

# RUN npx pnpm --filter ${FILTER_PACKAGE} typecheck
RUN npx pnpm --filter ${FILTER_PACKAGE} build

# ─── Production image ─────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ARG APP_DIR=web
ARG PORT=3000

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=${PORT}
ENV HOSTNAME="0.0.0.0"
ENV APP_DIR=${APP_DIR}

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/apps/${APP_DIR}/public ./apps/${APP_DIR}/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/${APP_DIR}/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/${APP_DIR}/.next/static ./apps/${APP_DIR}/.next/static

USER nextjs

EXPOSE ${PORT}

CMD ["sh", "-c", "node apps/${APP_DIR}/server.js"]
