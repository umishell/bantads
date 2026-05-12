#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INT="$REPO_ROOT/scripts/integration"
WORK="$REPO_ROOT/testReports/working"
ISS="$REPO_ROOT/testReports/issues"
mkdir -p "$WORK" "$ISS"
cd "$INT"
python -m pip install -q -r requirements.txt
STAMP="$(date -u +%Y-%m-%d_%H-%M-%S)_UTC"
export BANTADS_REPORT_STAMP="$STAMP"
export PYTHONPATH="$INT"
exec python -m pytest tests -v --tb=short --junitxml="$WORK/junit_${STAMP}.xml" -c pytest.ini "$@"
