#!/usr/bin/env bash
# Outputs the expandInlineRefs eval pass-rate as a bare number (e.g. 66.0).
# Used by autoresearch as the primary metric command.
set -euo pipefail
cd "$(dirname "$0")"
node run.mjs | grep '^Score:' | sed -E 's/.*\(([0-9.]+)%\)/\1/'
