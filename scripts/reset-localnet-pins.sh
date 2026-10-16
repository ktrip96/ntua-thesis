#!/usr/bin/env bash
# Makes the package re-publishable on a freshly regenesised localnet.
#
# `sui start --force-regenesis` mints a brand-new chain ID every run, which breaks
# two pinned references:
#   1. Move.toml  [environments] localnet = "<chain-id>"  -> build fails on mismatch
#   2. Published.toml [published.localnet]                 -> publish fails ("already published")
#
# This script re-pins Move.toml to the live chain ID and drops the stale
# Published.toml localnet entry so a subsequent `sui client publish` succeeds.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

MOVE_TOML="$PROJECT_ROOT/Move.toml"
PUBLISHED_TOML="$PROJECT_ROOT/Published.toml"

CHAIN_ID="$(sui client chain-identifier 2>/dev/null)"
if [ -z "$CHAIN_ID" ]; then
  echo "ERROR: could not read chain ID. Is localnet running? (sui client chain-identifier)"
  exit 1
fi

# 1. Re-pin Move.toml's localnet chain ID.
if [ -f "$MOVE_TOML" ]; then
  awk -v cid="$CHAIN_ID" '
    /^localnet[[:space:]]*=/ { print "localnet = \"" cid "\""; next }
    { print }
  ' "$MOVE_TOML" > "$MOVE_TOML.tmp" && mv "$MOVE_TOML.tmp" "$MOVE_TOML"
  echo "Re-pinned Move.toml localnet = \"$CHAIN_ID\""
fi

# 2. Drop any existing [published.localnet] table so publish doesn't refuse.
if [ -f "$PUBLISHED_TOML" ]; then
  awk '
    /^\[published\.localnet\]/ { skip = 1; next }
    /^\[/                      { skip = 0 }
    !skip                      { print }
  ' "$PUBLISHED_TOML" > "$PUBLISHED_TOML.tmp" && mv "$PUBLISHED_TOML.tmp" "$PUBLISHED_TOML"
  echo "Cleared stale [published.localnet] from Published.toml"
fi
