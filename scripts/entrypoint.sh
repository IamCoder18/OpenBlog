#!/bin/sh
set -e

if [ -z "${SMTP_HOST:-}" ] && [ -z "${SMTP_FROM:-}" ]; then
  echo "Warning: SMTP is not configured; email password recovery is disabled."
fi

echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting application..."
exec node server.js
