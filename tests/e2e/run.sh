#!/usr/bin/env bash
# Browser tests against a local copy of the app, with a stand-in for Claude.
# Needs: node, Python 3 with Playwright (pip install playwright && playwright install chromium).
#
#   npm run test:e2e
set -euo pipefail
cd "$(dirname "$0")/../.."
E2E=tests/e2e
rm -f $E2E/stub.log $E2E/STUB_MODE

node $E2E/stub.mjs & STUB=$!
npx wrangler dev --port 8787 --local \
  --var ANTHROPIC_URL:http://127.0.0.1:8799/v1/messages \
  --var ANTHROPIC_API_KEY:test --var ADMIN_TOKEN:test-admin \
  --var MENUS_PER_VISITOR_PER_DAY:500 --var MENUS_PER_DAY_TOTAL:1000 \
  > $E2E/wrangler.log 2>&1 & WRANGLER=$!
trap 'kill $STUB $WRANGLER 2>/dev/null || true' EXIT

for _ in $(seq 60); do curl -s -o /dev/null http://127.0.0.1:8787/ && break; sleep 1; done
python3 $E2E/test_app.py
