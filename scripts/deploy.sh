#!/usr/bin/env bash
# Deploys the Move package to localnet and syncs the package ID to app/.env

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "==> Re-pinning localnet chain ID / clearing stale publication..."
bash "$SCRIPT_DIR/reset-localnet-pins.sh"

echo ""
echo "==> Publishing package to localnet..."
cd "$PROJECT_ROOT"
sui client publish --gas-budget 100000000

echo ""
echo "==> Syncing env..."
bash "$SCRIPT_DIR/sync-env.sh"

echo ""
echo "Deploy complete! Run 'cd app && npm run dev' to start the frontend."
