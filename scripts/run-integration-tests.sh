#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INT="$REPO_ROOT/scripts/integration"
LOGS="$REPO_ROOT/testReports/logs"
JUNIT_DIR="$LOGS/junit"
PYTEST_DIR="$LOGS/pytest"
DOCKER_DIR="$LOGS/docker"
WORKING_DIR="$REPO_ROOT/testReports/working"
COMPOSE_FILE="$REPO_ROOT/docker-compose.yml"
DOCKER_SERVICES=(gateway ms-auth ms-cliente ms-conta ms-gerente ms-saga ms-email)

capture_docker_logs() {
  local out_file="$1"
  local tail_n="${2:-120}"
  {
    echo "# Docker Compose — snapshot pós-testes de integração"
    echo "# Gerado: $(date -Iseconds)"
    echo ""
  } >"$out_file"
  if ! command -v docker >/dev/null 2>&1; then
    echo "docker CLI não encontrado no PATH." >>"$out_file"
    return
  fi
  cd "$REPO_ROOT"
  for svc in "${DOCKER_SERVICES[@]}"; do
    echo "" >>"$out_file"
    echo "========== $svc (últimas $tail_n linhas) ==========" >>"$out_file"
    docker compose -f "$COMPOSE_FILE" logs --tail="$tail_n" --timestamps "$svc" >>"$out_file" 2>&1 || true
  done
}

mkdir -p "$LOGS" "$JUNIT_DIR" "$PYTEST_DIR" "$DOCKER_DIR" "$WORKING_DIR"
cd "$INT"
python -m pip install -q -r requirements.txt
export PYTHONPATH="$INT"
export BANTADS_POLL_VERBOSE="${BANTADS_POLL_VERBOSE:-1}"
export BANTADS_SAGA_WAIT_S="${BANTADS_SAGA_WAIT_S:-120}"
NAMES="$(python -m lib.report_names)"
export BANTADS_REPORT_BATCH_ID="$(python -c "import json,sys; print(json.load(sys.stdin)['batch_id'])" <<<"$NAMES")"
export BANTADS_REPORT_STAMP="$(python -c "import json,sys; print(json.load(sys.stdin)['stamp'])" <<<"$NAMES")"
JUNIT="$(python -c "import json,sys; print(json.load(sys.stdin)['junit'])" <<<"$NAMES")"
CONSOLE_LOG="$(python -c "import json,sys; print(json.load(sys.stdin)['console_log'])" <<<"$NAMES")"
DOCKER_LOG="$(python -c "import json,sys; print(json.load(sys.stdin)['docker_logs'])" <<<"$NAMES")"
PYTEST_EXTRA=()
if [ "${BANTADS_PYTEST_FULL_TRACE:-0}" = "1" ]; then
  PYTEST_EXTRA+=(--full-trace)
fi
echo "logs: $LOGS" >&2
echo "logs/junit: $JUNIT_DIR" >&2
echo "logs/pytest: $PYTEST_DIR" >&2
echo "logs/docker: $DOCKER_DIR" >&2
echo "console log: $PYTEST_DIR/$CONSOLE_LOG" >&2
set +e
python -m pytest tests -v --tb=short --junitxml="$JUNIT_DIR/$JUNIT" -c pytest.ini \
  "${PYTEST_EXTRA[@]}" "$@" 2>&1 | tee "$PYTEST_DIR/$CONSOLE_LOG"
EXIT_CODE=${PIPESTATUS[0]}
set -e

DOCKER_MODE="${BANTADS_DOCKER_LOGS:-on-fail}"
DOCKER_TAIL="${BANTADS_DOCKER_LOG_TAIL:-120}"
if [ "${BANTADS_NO_DOCKER_LOGS:-0}" != "1" ] && [ "$DOCKER_MODE" != "never" ]; then
  if [ "$DOCKER_MODE" = "always" ] || [ "$EXIT_CODE" -ne 0 ]; then
    echo "docker snapshot: $DOCKER_DIR/$DOCKER_LOG (tail=$DOCKER_TAIL, mode=$DOCKER_MODE)" >&2
    capture_docker_logs "$DOCKER_DIR/$DOCKER_LOG" "$DOCKER_TAIL"
  fi
fi
exit "$EXIT_CODE"
