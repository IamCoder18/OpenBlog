# syntax=docker/dockerfile:1

# ============================================
# Stage 1: Dependencies Installation Stage
# ============================================

ARG NODE_VERSION=22-alpine

FROM node:${NODE_VERSION} AS dependencies

# Install pnpm (supports json5 natively)
RUN npm install -g pnpm@9

WORKDIR /app

# Copy package files
COPY package.json5 pnpm-lock.yaml ./

# Install all dependencies (including dev for build)
RUN pnpm install --frozen-lockfile

# ============================================
# Stage 2: Build Next.js application in standalone mode
# ============================================

FROM node:${NODE_VERSION} AS builder

ARG DATABASE_URL

# Install pnpm
RUN npm install -g pnpm@9

WORKDIR /app

# Copy project dependencies from dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application source code
COPY . .

ENV NODE_ENV=production
ENV DATABASE_URL=${DATABASE_URL}

# Build Next.js application
RUN pnpm run build

# ============================================
# Stage 3: Run Next.js application
# ============================================

FROM node:${NODE_VERSION} AS runner

# Set working directory
WORKDIR /app

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy production assets
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/scripts/create-admin.js ./scripts/create-admin.js
COPY --from=builder --chown=node:node /app/scripts/promote-admin.js ./scripts/promote-admin.js
COPY --from=builder --chown=node:node /app/scripts/change-password.js ./scripts/change-password.js

# Create .next directory with correct permissions
RUN mkdir .next && chown node:node .next

# Copy the standalone output and static files
# Note: This requires output: 'standalone' in next.config.js
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/src ./src
COPY --from=builder --chown=node:node /app/node_modules ./node_modules

# Copy prisma directory for migrations
COPY --from=builder --chown=node:node /app/prisma ./prisma

# Copy and make entrypoint executable
COPY --from=builder --chown=node:node /app/scripts/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Switch to non-root user for security
USER node

# Expose port 3000
EXPOSE 3000

# Start application via entrypoint (runs migrations first)
CMD ["./entrypoint.sh"]