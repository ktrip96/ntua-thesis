#!/usr/bin/env bash
# One-command dev setup: starts localnet, deploys the package, and launches the frontend.
# Usage: ./scripts/dev.sh
# Press Ctrl+C to stop everything.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Cleanup: kill background processes on exit
cleanup() {
  echo ""
  echo "==> Shutting down..."
  if [ -n "${SUI_PID:-}" ]; then
    kill "$SUI_PID" 2>/dev/null || true
    wait "$SUI_PID" 2>/dev/null || true
  fi
  exit 0
}
trap cleanup INT TERM

# --- 1. Start localnet in the background ---
echo "==> Starting Sui localnet..."
sui start --force-regenesis --with-faucet &
SUI_PID=$!

# Wait for the RPC endpoint to be ready
echo "==> Waiting for localnet to be ready..."
RETRIES=0
MAX_RETRIES=30
until curl -s -o /dev/null -w '' http://127.0.0.1:9000 2>/dev/null; do
  RETRIES=$((RETRIES + 1))
  if [ "$RETRIES" -ge "$MAX_RETRIES" ]; then
    echo "ERROR: Localnet did not start within ${MAX_RETRIES}s"
    kill "$SUI_PID" 2>/dev/null || true
    exit 1
  fi
  sleep 1
done
echo "==> Localnet is ready (took ~${RETRIES}s)"

# --- 2. Deploy the package and sync env ---
echo ""
echo "==> Re-pinning localnet chain ID / clearing stale publication..."
bash "$SCRIPT_DIR/reset-localnet-pins.sh"

echo ""
echo "==> Publishing package to localnet..."
cd "$PROJECT_ROOT"
sui client publish --gas-budget 100000000

echo ""
echo "==> Syncing env..."
bash "$SCRIPT_DIR/sync-env.sh"

# --- 3. Start the frontend ---
echo ""
echo "==> Starting frontend dev server..."
cd "$PROJECT_ROOT/app"
npm run dev
