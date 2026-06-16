#!/bin/bash
set -e

# Clean up stale Xvfb lock files from previous runs
echo "[entrypoint] Cleaning up stale Xvfb locks..."
rm -f /tmp/.X99-lock
rm -f /tmp/.X11-unix/X99

# Ensure mounted data directory is writable by the non-root user
if [ -d /app/.data ]; then
    chown -R cloakbrowser:cloakbrowser /app/.data 2>/dev/null || true
fi

# Start Xvfb in the background (runs as root for display server access)
echo "[entrypoint] Starting Xvfb on display :99..."
Xvfb :99 -screen 0 1920x1080x24 &
XVFB_PID=$!

# Wait for Xvfb to be ready
sleep 2

# Verify Xvfb is running
if ! kill -0 $XVFB_PID 2>/dev/null; then
    echo "[entrypoint] ERROR: Xvfb failed to start"
    exit 1
fi

echo "[entrypoint] Xvfb started successfully (PID: $XVFB_PID)"

# Drop privileges and run the node bridge script as non-root user
echo "[entrypoint] Starting CloakBrowser bridge as cloakbrowser user..."
exec runuser -u cloakbrowser -- node /app/cloakbrowser-bridge.mjs
