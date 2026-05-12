"""R3–R8 — operações de conta via gateway (cliente seed cli1/cli2)."""

from __future__ import annotations

from datetime import date, timedelta

import pytest

from lib.gateway_client import GatewayClient


@pytest.mark.gateway
def test_conta_saldo_extrato_deposito_saque_transferencia(
    gateway_client: GatewayClient,
    tokens: dict,
    seed_contas: dict,
):
    n1 = seed_contas["numero_cli1"]
    n2 = seed_contas["numero_cli2"]
    tc = tokens["cliente"]

    saldo_antes = gateway_client.get_json(f"/api/contas/{n1}/saldo", token=tc)
    assert saldo_antes["numero"] == n1

    dep = gateway_client.request("POST", f"/api/contas/{n1}/depositar", token=tc, json_body={"valor": 10.0})
    assert dep.status_code == 200, dep.text
    dep_j = dep.json()
    assert dep_j.get("tipo") is not None

    sac = gateway_client.request("POST", f"/api/contas/{n1}/sacar", token=tc, json_body={"valor": 1.0})
    assert sac.status_code == 200, sac.text

    xfer = gateway_client.request(
        "POST",
        f"/api/contas/{n1}/transferir",
        token=tc,
        json_body={"numeroContaDestino": n2, "valor": 2.0},
    )
    assert xfer.status_code == 200, xfer.text

    end = date.today()
    start = end - timedelta(days=31)
    ex = gateway_client.request(
        "GET",
        f"/api/contas/{n1}/extrato",
        token=tc,
        params={"dataInicio": start.isoformat(), "dataFim": end.isoformat()},
    )
    assert ex.status_code == 200, ex.text
    extrato = ex.json()
    assert isinstance(extrato, list)
    assert len(extrato) >= 1


@pytest.mark.gateway
def test_transferencia_mesma_conta_retorna_erro(gateway_client: GatewayClient, tokens: dict, seed_contas: dict):
    n1 = seed_contas["numero_cli1"]
    r = gateway_client.request(
        "POST",
        f"/api/contas/{n1}/transferir",
        token=tokens["cliente"],
        json_body={"numeroContaDestino": n1, "valor": 1.0},
    )
    assert r.status_code == 400, r.text


@pytest.mark.gateway
def test_gerente_patch_limite(gateway_client: GatewayClient, tokens: dict, seed_contas: dict):
    n1 = seed_contas["numero_cli1"]
    r = gateway_client.request(
        "PATCH",
        f"/api/contas/{n1}/limite",
        token=tokens["gerente"],
        json_body={"limite": 999.99},
    )
    assert r.status_code == 204, r.text
    saldo = gateway_client.get_json(f"/api/contas/{n1}/saldo", token=tokens["cliente"])
    assert float(saldo["limite"]) == pytest.approx(999.99, rel=1e-4)


@pytest.mark.gateway
def test_gerente_top3_e_listagem(gateway_client: GatewayClient, tokens: dict):
    t3 = gateway_client.request("GET", "/api/contas/top3", token=tokens["gerente"])
    assert t3.status_code == 200, t3.text
    assert isinstance(t3.json(), list)

    lst = gateway_client.request("GET", "/api/contas", token=tokens["gerente"])
    assert lst.status_code == 200, lst.text
    assert isinstance(lst.json(), list)
