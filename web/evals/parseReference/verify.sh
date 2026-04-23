#!/usr/bin/env bash
# Outputs the parseReference eval pass-rate as a bare number (e.g. 100.0).
# Used as guard by parserPerf autoresearch loop.
set -euo pipefail
cd "$(dirname "$0")"
node run.mjs | grep '^Score:' | sed -E 's/.*\(([0-9.]+)%\)/\1/'
