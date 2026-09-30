#!/bin/bash
set -euo pipefail

# Only run in Claude Code on the web sessions
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

pnpm install --prefer-offline

# Install the headless Chromium build that the locked Playwright version expects.
# No-op when it's already present. A failed download shouldn't block the session.
export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-/opt/pw-browsers}"
pnpm exec playwright install --only-shell chromium ||
  echo "session-start: Playwright browser install failed; E2E tests may not run" >&2
