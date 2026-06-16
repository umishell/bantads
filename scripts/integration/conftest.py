"""
Fixtures de sessão + relatórios em ``testReports/working/`` (resumos) e ``testReports/issues/`` (falhas).
"""

from __future__ import annotations

import os
import re
from pathlib import Path

import httpx
import pytest

from lib.gateway_client import GatewayClient, sugestao_para_falha
from lib.report_names import (
    ISSUES_DIR,
    LOGS_DIR,
    WORKING_DIR,
    batch_id_from_stamp,
    batch_id_legivel,
    report_names,
    stamp_legivel,
)

_FAILURES: list[dict] = []
_PASSED: list[str] = []


def _resolve_report_ids() -> tuple[str, str]:
    """Retorna ``(batch_id, stamp)`` da leva atual (env ou geração em BRT)."""
    stamp = os.environ.get("BANTADS_REPORT_STAMP")
    batch_id = os.environ.get("BANTADS_REPORT_BATCH_ID")
    if stamp and not batch_id:
        batch_id = batch_id_from_stamp(stamp)
    if stamp and batch_id:
        return batch_id, stamp
    names = report_names()
    return names["batch_id"], names["stamp"]


def pytest_configure(config: pytest.Config) -> None:
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    ISSUES_DIR.mkdir(parents=True, exist_ok=True)
    WORKING_DIR.mkdir(parents=True, exist_ok=True)
    # Scripts `run-integration-tests.*` exportam batch_id + stamp alinhados ao `junit`.
    batch_id, stamp = _resolve_report_ids()
    config._bantads_batch_id = batch_id  # type: ignore[attr-defined]
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
    batch_id = getattr(session.config, "_bantads_batch_id", "unknown")
    if batch_id == "unknown" or stamp == "unknown":
        names = report_names()
        batch_id = names["batch_id"]
        stamp = names["stamp"]
        summary_name = names["passed_summary"]
        feedback_name = names["agent_feedback"]
    else:
        summary_name = f"{batch_id}passed-summary__{stamp}.md"
        feedback_name = f"{batch_id}agent-feedback__{stamp}.md"
    batch_leg = batch_id_legivel(batch_id)
    # Resumo do que passou (para auditoria / “partes funcionando”)
    summary_path = WORKING_DIR / summary_name
    leg = stamp_legivel(stamp)
    lines = [
        "# Testes integração — o que passou",
        "",
        f"- **Leva (ID):** `{batch_leg}`",
        f"- **Quando (BRT):** {leg}",
        f"- **Identificador do arquivo:** `{summary_name}`",
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
    issues_path = ISSUES_DIR / feedback_name
    leg = stamp_legivel(stamp)
    if not _FAILURES:
        issues_path.write_text(
            "\n".join(
                [
                    "# Problemas encontrados — integração BANTADS",
                    "",
                    f"- **Leva (ID):** `{batch_leg}`",
                    f"- **Quando (BRT):** {leg}",
                    f"- **Identificador do arquivo:** `{feedback_name}`",
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
        f"- **Leva (ID):** `{batch_leg}`",
        f"- **Quando (BRT):** {leg}",
        f"- **Identificador do arquivo:** `{feedback_name}`",
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
    """Reseta PostgreSQL (cliente, gerente, conta) + Mongo (auth) antes da suíte."""
    from lib.integration_reboot import integration_reboot

    integration_reboot(gateway_client, profile="full")


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
    from lib.seed_data import SEED_CONTA_CLI1, SEED_CONTA_CLI2

    n1 = gateway_client.get_json(f"/api/contas/por-cliente/{seed_cli1_ids['id_cli1']}", token=t)
    n2 = gateway_client.get_json(f"/api/contas/por-cliente/{seed_cli1_ids['id_cli2']}", token=tokens["cliente2"])
    numero_cli1 = str(n1["numero"])
    numero_cli2 = str(n2["numero"])
    assert numero_cli1 == SEED_CONTA_CLI1, f"conta cli1 esperada {SEED_CONTA_CLI1}, obtida {numero_cli1}"
    assert numero_cli2 == SEED_CONTA_CLI2, f"conta cli2 esperada {SEED_CONTA_CLI2}, obtida {numero_cli2}"
    return {"numero_cli1": numero_cli1, "numero_cli2": numero_cli2}
