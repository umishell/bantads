"""Nomes e pastas de relatórios de integração (ID de leva + carimbo BRT)."""

from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

# …/bantads (lib → integration → scripts → raiz)
REPO_ROOT = Path(__file__).resolve().parents[3]
TEST_REPORTS_DIR = REPO_ROOT / "testReports"
LOGS_DIR = TEST_REPORTS_DIR / "logs"
JUNIT_DIR = LOGS_DIR / "junit"
PYTEST_DIR = LOGS_DIR / "pytest"
DOCKER_DIR = LOGS_DIR / "docker"
ISSUES_DIR = TEST_REPORTS_DIR / "issues"
WORKING_DIR = TEST_REPORTS_DIR / "working"

try:
    BRT = ZoneInfo("America/Sao_Paulo")
except Exception:
    # Brasil sem DST desde 2019 — offset fixo UTC-3.
    BRT = timezone(timedelta(hours=-3))

# Windows proíbe ``:`` em nomes de arquivo; na leva usamos hífen (``5.17[12-47]``).
_BATCH_ID_RE = re.compile(r"^(\d+\.\d+)\[(\d{2})-(\d{2})\]$")


def report_names(now: datetime | None = None) -> dict[str, str]:
    """
    Gera nomes alinhados para uma mesma leva de testes.

    Arquivo (ex.): ``5.17[12-47]agent-feedback__2026-05-12[12-47-00]BRT.md``
    Legível (ex.): ``5.17[12:47]`` via :func:`batch_id_legivel`.
    """
    dt = (now or datetime.now(BRT)).astimezone(BRT)
    batch_id = f"{dt.month}.{dt.day}[{dt.hour:02d}-{dt.minute:02d}]"
    stamp = dt.strftime("%Y-%m-%d[%H-%M-%S]BRT")
    return {
        "batch_id": batch_id,
        "stamp": stamp,
        "junit": f"{batch_id}junit__{stamp}.xml",
        "passed_summary": f"{batch_id}passed-summary__{stamp}.md",
        "agent_feedback": f"{batch_id}agent-feedback__{stamp}.md",
        "console_log": f"{batch_id}pytest-console__{stamp}.log",
        "docker_logs": f"{batch_id}docker-compose__{stamp}.log",
    }


def batch_id_from_stamp(stamp: str) -> str | None:
    """Deriva o ID de leva (``mes.dia[hr-min]``) a partir do carimbo BRT."""
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})\[(\d{2})-(\d{2})-\d{2}\]BRT$", stamp)
    if not m:
        return None
    _y, mo, day, hr, minute = m.groups()
    return f"{int(mo)}.{int(day)}[{hr}-{minute}]"


def batch_id_legivel(batch_id: str) -> str:
    """``5.17[12-47]`` → ``5.17[12:47]`` (só para exibição em relatórios)."""
    m = _BATCH_ID_RE.match(batch_id)
    if m:
        prefix, h, mi = m.groups()
        return f"{prefix}[{h}:{mi}]"
    # compat: ID antigo com dois-pontos
    m2 = re.match(r"^(\d+\.\d+)\[(\d{2}):(\d{2})\]$", batch_id)
    if m2:
        prefix, h, mi = m2.groups()
        return f"{prefix}[{h}:{mi}]"
    return batch_id


def stamp_legivel(stamp: str) -> str:
    """Converte ``2026-05-12[12-47-00]BRT`` em frase legível."""
    if stamp == "unknown":
        return stamp
    m = re.match(r"^(\d{4}-\d{2}-\d{2})\[(\d{2})-(\d{2})-(\d{2})\]BRT$", stamp)
    if m:
        date_part, h, minute, sec = m.groups()
        return f"{date_part} às {h}:{minute}:{sec} BRT"
    return stamp


def report_paths(now: datetime | None = None) -> dict[str, str]:
    """Nomes de arquivo + pastas sob ``testReports/``."""
    names = report_names(now)
    names["logs_dir"] = str(LOGS_DIR)
    names["junit_dir"] = str(JUNIT_DIR)
    names["pytest_dir"] = str(PYTEST_DIR)
    names["docker_dir"] = str(DOCKER_DIR)
    names["issues_dir"] = str(ISSUES_DIR)
    names["working_dir"] = str(WORKING_DIR)
    return names


if __name__ == "__main__":
    print(json.dumps(report_paths()))
