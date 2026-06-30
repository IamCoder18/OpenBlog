# syntax=docker/dockerfile:1.7

# ─────────────────────────────────────────────────────────────────────────────
# OpenBlog — production Dockerfile
# ─────────────────────────────────────────────────────────────────────────────
# This image builds with ZERO required env vars. Defaults are baked in via
# `ENV`. Runtime configuration (DATABASE_URL, AUTH_SECRET, BASE_URL, etc.)
# is injected by the consumer's `docker-compose.yaml` at container start.
#
# To customize the baked-in defaults (NEXT_PUBLIC_*), fork the repo and
# build your own image — these values are inlined into the client bundle
# at build time and cannot be changed without rebuilding.
# ─────────────────────────────────────────────────────────────────────────────

ARG NODE_VERSION=22-alpine

# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: fetcher — install deps with BuildKit cache
# ─────────────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS fetcher

WORKDIR /app

# corepack ships with node:22 but may pick a cached wrong pnpm version
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY package.json5 pnpm-lock.yaml .npmrc ./

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: builder — generate Prisma client + build Next.js
# ─────────────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY --from=fetcher /app/node_modules ./node_modules
COPY . .

# Bake sensible defaults. `NEXT_PUBLIC_*` are inlined into the client bundle
# at build time. If you fork this repo, change these to your project's
# branding before building your own image.
#
#   NEXT_PUBLIC_BASE_URL    — used by client fetch helpers and OG fallbacks.
#                             Override at RUNTIME via BASE_URL (server-only).
#   NEXT_PUBLIC_BLOG_NAME   — used by <title>, nav, footer. Override at
#                             RUNTIME via BLOG_NAME; the server uses that
#                             value but the client keeps this baked default
#                             unless you rebuild.
#
# DATABASE_URL is NOT needed at build time — Prisma 7 reads it from
# prisma.config.ts which loads it via dotenv at runtime.
ENV NODE_ENV=production \
    NEXT_PUBLIC_BASE_URL="http://localhost:3000" \
    NEXT_PUBLIC_BLOG_NAME="OpenBlog"

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm exec prisma generate

RUN --mount=type=cache,id=next,target=/app/.next/cache \
    pnpm run build

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm prune --prod

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3: runner — minimal image with prod-only deps
# ─────────────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/src/lib/prisma ./src/lib/prisma
COPY --from=builder --chown=node:node /app/prisma.config.ts ./prisma.config.ts

COPY --from=builder --chown=node:node /app/scripts/entrypoint.sh ./entrypoint.sh
COPY --from=builder --chown=node:node /app/scripts/create-admin.js ./scripts/create-admin.js
COPY --from=builder --chown=node:node /app/scripts/promote-admin.js ./scripts/promote-admin.js
COPY --from=builder --chown=node:node /app/scripts/change-password.js ./scripts/change-password.js
RUN chmod +x ./entrypoint.sh

RUN mkdir -p .next && chown -R node:node .next

USER node

EXPOSE 3000

CMD ["./entrypoint.sh"]