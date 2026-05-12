"""
Fixtures de sessão + geração de relatórios em ``testReports/working`` e ``testReports/issues``.
"""

from __future__ import annotations

import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path

import httpx
import pytest

from lib.gateway_client import GatewayClient, sugestao_para_falha

# Raiz do repositório (…/bantads)
ROOT = Path(__file__).resolve().parents[2]
REPORTS = ROOT / "testReports"
WORKING = REPORTS / "working"
ISSUES = REPORTS / "issues"

_FAILURES: list[dict] = []
_PASSED: list[str] = []


def _report_stamp_utc() -> str:
    """Nome de arquivo legível: data + hora UTC (ex.: ``2026-05-12_00-46-54_UTC``)."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%d_%H-%M-%S_UTC")


def _stamp_legivel(stamp: str) -> str:
    """Converte ``2026-05-12_00-46-54_UTC`` em frase legível (ex.: ``2026-05-12 às 00:46:54 UTC``)."""
    if stamp == "unknown" or not stamp.endswith("_UTC"):
        return stamp
    body = stamp[:-4]
    try:
        date_part, time_part = body.split("_", 1)
        h, minute, sec = time_part.split("-")
        return f"{date_part} às {h}:{minute}:{sec} UTC"
    except ValueError:
        return stamp


def pytest_configure(config: pytest.Config) -> None:
    WORKING.mkdir(parents=True, exist_ok=True)
    ISSUES.mkdir(parents=True, exist_ok=True)
    # Scripts `run-integration-tests.*` podem exportar o mesmo carimbo que o `junit`.
    stamp = os.environ.get("BANTADS_REPORT_STAMP") or _report_stamp_utc()
    config._bantads_stamp = stamp  # type: ignore[attr-defined]


@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item: pytest.Item, call: pytest.CallInfo):
    outcome = yield
    rep = outcome.get_result()
    if rep.when != "call":
        return
    if rep.passed:
        _PASSED.append(item.nodeid)
    if rep.failed:
        exc = str(rep.longrepr) if rep.longrepr else ""
        _FAILURES.append(
            {
                "nodeid": item.nodeid,
                "exc": exc,
                "sections": getattr(rep, "sections", []),
            }
        )


def pytest_sessionfinish(session: pytest.Session, exitstatus: int) -> None:
    stamp = getattr(session.config, "_bantads_stamp", "unknown")
    # Resumo do que passou (para auditoria / “partes funcionando”)
    summary_path = WORKING / f"passed-summary_{stamp}.md"
    leg = _stamp_legivel(stamp)
    lines = [
        "# Testes integração — o que passou",
        "",
        f"- **Quando (UTC):** {leg}",
        f"- **Identificador do arquivo:** `{stamp}`",
        f"- **Exit status pytest:** `{exitstatus}`",
        "",
        "## Casos OK",
        "",
    ]
    for p in sorted(_PASSED):
        lines.append(f"- `{p}`")
    lines.append("")
    summary_path.write_text("\n".join(lines), encoding="utf-8")

    # Relatório só de problemas + sugestões (para realimentar agente)
    issues_path = ISSUES / f"agent-feedback_{stamp}.md"
    leg = _stamp_legivel(stamp)
    if not _FAILURES:
        issues_path.write_text(
            "\n".join(
                [
                    "# Problemas encontrados — integração BANTADS",
                    "",
                    f"- **Quando (UTC):** {leg}",
                    f"- **Identificador do arquivo:** `{stamp}`",
                    "",
                    "Nenhuma falha registrada nesta execução.",
                    "",
                ]
            ),
            encoding="utf-8",
        )
        return

    out: list[str] = [
        "# Problemas encontrados — integração BANTADS",
        "",
        "Use este arquivo para colar de volta no agente (Cursor) com o contexto de falha.",
        "",
        f"- **Quando (UTC):** {leg}",
        f"- **Identificador do arquivo:** `{stamp}`",
        "",
    ]
    for i, f in enumerate(_FAILURES, 1):
        node = f["nodeid"]
        exc = f["exc"]
        status = None
        m = re.search(r"HTTP (\d{3})", exc)
        if m:
            status = int(m.group(1))
        for token in ("401", "403", "404", "409", "422", "500", "502", "503"):
            if status is None and token in exc:
                status = int(token)
                break
        body_snip = exc[:1200]
        tips = sugestao_para_falha(status, body_snip, node, exc)
        out.append(f"## {i}. `{node}`")
        out.append("")
        out.append("### Erro / traceback (trecho)")
        out.append("")
        out.append("```")
        out.append(exc[:4000])
        out.append("```")
        out.append("")
        out.append("### Sugestões para correção")
        out.append("")
        for t in tips:
            out.append(f"- {t}")
        out.append("")
    issues_path.write_text("\n".join(out), encoding="utf-8")


@pytest.fixture(scope="session")
def gateway_url() -> str:
    # 127.0.0.1 evita falhas esporádicas de resolução de `localhost` em alguns ambientes Windows.
    return os.environ.get("BANTADS_GATEWAY", "http://127.0.0.1").rstrip("/")


@pytest.fixture(scope="session")
def mailhog_url() -> str:
    return os.environ.get("BANTADS_MAILHOG", "http://127.0.0.1:8025").rstrip("/")


@pytest.fixture(scope="session")
def rabbitmq_api_url() -> str:
    return os.environ.get("BANTADS_RABBITMQ_API", "http://127.0.0.1:15672").rstrip("/")


@pytest.fixture(scope="session")
def gateway_client(gateway_url: str) -> GatewayClient:
    c = GatewayClient(gateway_url)
    yield c
    c.close()


@pytest.fixture(scope="session")
def http_misc() -> httpx.Client:
    c = httpx.Client(timeout=30.0)
    yield c
    c.close()


@pytest.fixture(scope="session")
def seed_stack(gateway_client: GatewayClient) -> None:
    """Reseta usuários seed no Mongo (ms-auth) antes da suíte."""
    r = gateway_client.request("GET", "/api/auth/reboot")
    assert r.status_code == 200, f"reboot: {r.status_code} {r.text}"


@pytest.fixture(scope="session")
def tokens(seed_stack, gateway_client: GatewayClient) -> dict[str, str]:
    def login(email: str) -> str:
        resp = gateway_client.post_json(
            "/api/auth/login",
            {"login": email, "senha": "tads"},
            expect=200,
        )
        data = resp.json()
        tok = data.get("access_token")
        assert tok, f"login sem access_token: {data}"
        return str(tok)

    return {
        "cliente": login("cli1@bantads.com.br"),
        "cliente2": login("cli2@bantads.com.br"),
        "gerente": login("ger1@bantads.com.br"),
        "admin": login("adm1@bantads.com.br"),
    }


@pytest.fixture(scope="session")
def seed_cli1_ids(gateway_client: GatewayClient, tokens: dict[str, str]) -> dict[str, str]:
    """CPF seed cli1 → UUID ms-cliente (via gerente / gateway)."""
    cpf_cli1 = "12912861012"
    cpf_cli2 = "09506382000"
    g = tokens["gerente"]
    j1 = gateway_client.get_json(f"/api/clientes/{cpf_cli1}", token=g)
    j2 = gateway_client.get_json(f"/api/clientes/{cpf_cli2}", token=g)
    return {
        "cpf_cli1": cpf_cli1,
        "cpf_cli2": cpf_cli2,
        "id_cli1": str(j1["id"]),
        "id_cli2": str(j2["id"]),
    }


@pytest.fixture(scope="session")
def seed_contas(
    gateway_client: GatewayClient, tokens: dict[str, str], seed_cli1_ids: dict[str, str]
) -> dict[str, str]:
    """Números de conta (4 dígitos) dos clientes seed."""
    t = tokens["cliente"]
    n1 = gateway_client.get_json(f"/api/contas/por-cliente/{seed_cli1_ids['id_cli1']}", token=t)
    n2 = gateway_client.get_json(f"/api/contas/por-cliente/{seed_cli1_ids['id_cli2']}", token=tokens["cliente2"])
    return {"numero_cli1": str(n1["numero"]), "numero_cli2": str(n2["numero"])}
