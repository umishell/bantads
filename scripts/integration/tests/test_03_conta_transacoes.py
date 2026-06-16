"""R3–R8 — operações de conta via gateway (cliente seed cli1/cli2)."""

from __future__ import annotations

from datetime import date, timedelta

import pytest

from lib.gateway_client import GatewayClient
from lib.seed_data import SEED_SALDO_CLI2


@pytest.mark.gateway
def test_r3_cliente_saldo_negativo_seed_cli2(gateway_client: GatewayClient, tokens: dict, seed_contas: dict):
    """R3 — saldo negativo do seed (antes de qualquer encerramento de conta)."""
    n2 = seed_contas["numero_cli2"]
    saldo = gateway_client.get_json(f"/api/contas/{n2}/saldo", token=tokens["cliente2"])
    assert float(saldo["saldo"]) == pytest.approx(SEED_SALDO_CLI2, rel=1e-3)
    assert float(saldo["limite"]) == pytest.approx(10000.0, rel=1e-3)


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
    saldo_origem_antes = float(saldo_antes["saldo"])
    saldo_dest_antes = float(
        gateway_client.get_json(f"/api/contas/{n2}/saldo", token=tokens["cliente2"])["saldo"]
    )

    dep = gateway_client.request("POST", f"/api/contas/{n1}/depositar", token=tc, json_body={"valor": 10.0})
    assert dep.status_code == 200, dep.text

    sac = gateway_client.request("POST", f"/api/contas/{n1}/sacar", token=tc, json_body={"valor": 1.0})
    assert sac.status_code == 200, sac.text

    valor_xfer = 2.0
    xfer = gateway_client.request(
        "POST",
        f"/api/contas/{n1}/transferir",
        token=tc,
        json_body={"numeroContaDestino": n2, "valor": valor_xfer},
    )
    assert xfer.status_code == 200, xfer.text

    saldo_origem_depois = float(gateway_client.get_json(f"/api/contas/{n1}/saldo", token=tc)["saldo"])
    saldo_dest_depois = float(
        gateway_client.get_json(f"/api/contas/{n2}/saldo", token=tokens["cliente2"])["saldo"]
    )
    assert saldo_origem_depois == pytest.approx(saldo_origem_antes + 10.0 - 1.0 - valor_xfer, rel=1e-3)
    assert saldo_dest_depois == pytest.approx(saldo_dest_antes + valor_xfer, rel=1e-3)

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
    assert isinstance(extrato, dict)
    assert "saldoInicial" in extrato
    assert "lancamentos" in extrato
    rows = extrato["lancamentos"]
    assert isinstance(rows, list)
    assert len(rows) >= 1

    xfer_rows = [r for r in rows if str(r.get("tipo", "")).upper() in ("TRANSFERENCIA", "TRANSFERÊNCIA", "TRANSFER")]
    assert xfer_rows, "extrato deve conter lançamento de transferência (R8)"
    row = xfer_rows[0]
    for key in ("dataHora", "tipo", "valor", "contraparteContaNumero", "saldoApos", "natureza"):
        assert key in row, f"campo {key} ausente no extrato (R8)"
    assert str(row["contraparteContaNumero"]) == n2


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
    t3 = gateway_client.get_json("/api/contas/top3", token=tokens["gerente"])
    assert isinstance(t3, list)
    assert 1 <= len(t3) <= 3
    saldos = [float(x["saldo"]) for x in t3]
    assert saldos == sorted(saldos, reverse=True)
    for row in t3:
        assert row.get("numero")
        assert "saldo" in row

    lst = gateway_client.get_json("/api/contas", token=tokens["gerente"])
    assert isinstance(lst, list)
    assert len(lst) >= 1
