#!/usr/bin/env bash
# Regression guard: parseReference eval must remain at 100%.
# Exits 0 if pass-rate is 100.0, exits 1 otherwise.
set -euo pipefail
cd "$(dirname "$0")/../parseReference"
SCORE=$(node run.mjs | grep '^Score:' | sed -E 's/.*\(([0-9.]+)%\)/\1/')
if [ "$SCORE" = "100.0" ]; then
  exit 0
else
  echo "parseReference regressed to $SCORE%" >&2
  exit 1
fi
