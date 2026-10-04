#!/usr/bin/env bash
# Start a disposable Rekolekt API at the pinned core revision, run the kit's
# integration tests against it, and tear it down.
#
#   REKOLEKT_CORE_DIR=/path/to/rekolekt integration/run.sh
#
# The core checkout must be at openapi/core-revision.txt (checked below).
set -Eeuo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
: "${REKOLEKT_CORE_DIR:?set REKOLEKT_CORE_DIR to a Rekolekt core checkout}"
REKOLEKT_CORE_DIR="$(cd -- "${REKOLEKT_CORE_DIR}" && pwd -P)"
export REKOLEKT_CORE_DIR
pinned="$(tr -d '[:space:]' < "${ROOT}/openapi/core-revision.txt")"
actual="$(git -C "${REKOLEKT_CORE_DIR}" rev-parse HEAD)"
if [[ "${actual}" != "${pinned}" && "${ALLOW_CORE_REVISION_MISMATCH:-0}" != 1 ]]; then
  printf 'Core checkout is at %s but the kit pins %s.\n' "${actual}" "${pinned}" >&2
  exit 1
fi
export REKOLEKT_CORE_REVISION="${actual:0:12}"
PROJECT="rekolekt-web-it-${GITHUB_RUN_ID:-local}-$$"
COMPOSE=(docker compose -p "${PROJECT}" -f "${ROOT}/integration/compose.yml")

cleanup() {
  local status=$?
  if [[ "${status}" != 0 ]]; then "${COMPOSE[@]}" logs --no-color --tail 200 api migrations >&2 || true; fi
  "${COMPOSE[@]}" down --volumes --remove-orphans >/dev/null 2>&1 || true
  exit "${status}"
}
trap cleanup EXIT INT TERM

"${COMPOSE[@]}" build migrations
"${COMPOSE[@]}" up -d --wait db redis
"${COMPOSE[@]}" run --rm --no-deps migrations
"${COMPOSE[@]}" exec -T db psql -U postgres -d rekolekt_it -v ON_ERROR_STOP=1 -q < "${ROOT}/integration/seed.sql"
"${COMPOSE[@]}" up -d --wait --no-deps api
port="$("${COMPOSE[@]}" port api 8000)"
port="${port##*:}"
export REKOLEKT_API_URL="http://${REKOLEKT_IT_HOST:-localhost}:${port}"
printf 'Rekolekt API %s at %s\n' "${REKOLEKT_CORE_REVISION}" "${REKOLEKT_API_URL}"
cd "${ROOT}"
npx vitest run --config vitest.integration.config.ts
