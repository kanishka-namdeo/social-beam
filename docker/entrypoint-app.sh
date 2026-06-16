#!/bin/bash
set -e

echo "[entrypoint] Starting Social Beam application..."

# Run Prisma migrations
echo "[entrypoint] Running database migrations..."
npx prisma migrate deploy

if [ $? -ne 0 ]; then
    echo "[entrypoint] ERROR: Database migration failed"
    exit 1
fi

echo "[entrypoint] Migrations completed successfully"

# Start the Next.js application
echo "[entrypoint] Starting Next.js server..."
exec node server.js
