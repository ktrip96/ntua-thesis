#!/usr/bin/env bash
# Reads Published.toml [published.localnet] and writes VITE_PACKAGE_ID to app/.env

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

TOML_FILE="$PROJECT_ROOT/Published.toml"
ENV_FILE="$PROJECT_ROOT/app/.env"
ENV_NAME="localnet"

if [ ! -f "$TOML_FILE" ]; then
  echo "ERROR: $TOML_FILE not found."
  echo "Deploy the contract first: ./scripts/deploy.sh"
  exit 1
fi

# Extract the published-at line from the [published.<env>] table.
PACKAGE_ID=$(awk -v env="[published.$ENV_NAME]" '
  $0 == env { in_block = 1; next }
  /^\[/ { in_block = 0 }
  in_block && /^published-at/ {
    match($0, /"[^"]+"/)
    print substr($0, RSTART + 1, RLENGTH - 2)
    exit
  }
' "$TOML_FILE")

if [ -z "$PACKAGE_ID" ]; then
  echo "ERROR: Could not extract published-at for [published.$ENV_NAME] from $TOML_FILE"
  exit 1
fi

echo "VITE_PACKAGE_ID=$PACKAGE_ID" > "$ENV_FILE"
echo "Synced VITE_PACKAGE_ID=$PACKAGE_ID → app/.env"
