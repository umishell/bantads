"""Valida dados pré-cadastrados do PDF (seção 4) após reboot de integração."""

from __future__ import annotations

import pytest

from lib.gateway_client import GatewayClient
from lib.saga_flow import login
from lib.seed_data import (
    SEED_CONTA_CLI1,
    SEED_CONTA_CLI2,
    SEED_CONTA_CLI3,
    SEED_CONTA_CLI4,
    SEED_CONTA_CLI5,
    SEED_CPF_CLI1,
    SEED_CPF_CLI2,
    SEED_EMAIL_CLI1,
    SEED_EMAIL_CLI2,
    SEED_EMAIL_CLI3,
    SEED_EMAIL_CLI4,
    SEED_EMAIL_CLI5,
    SEED_LIMITE_CLI2,
    SEED_LIMITE_CLI3,
    SEED_SALDO_CLI1,
    SEED_SALDO_CLI2,
    SEED_SALDO_CLI3,
    SEED_SALDO_CLI4,
    SEED_SALDO_CLI5,
)


def _assert_saldo_conta(
    gateway_client: GatewayClient,
    numero: str,
    saldo_esperado: float,
    limite_esperado: float,
    token: str,
) -> None:
    s = gateway_client.get_json(f"/api/contas/{numero}/saldo", token=token)
    assert float(s["saldo"]) == pytest.approx(saldo_esperado, rel=1e-3)
    assert float(s["limite"]) == pytest.approx(limite_esperado, rel=1e-3)


@pytest.mark.seed
@pytest.mark.gateway
def test_seed_pdf_contas_e_saldos(
    gateway_client: GatewayClient,
    tokens: dict,
    seed_contas: dict,
):
    assert seed_contas["numero_cli1"] == SEED_CONTA_CLI1
    assert seed_contas["numero_cli2"] == SEED_CONTA_CLI2

    _assert_saldo_conta(
        gateway_client, SEED_CONTA_CLI1, SEED_SALDO_CLI1, 5000.0, tokens["cliente"]
    )
    _assert_saldo_conta(
        gateway_client, SEED_CONTA_CLI2, SEED_SALDO_CLI2, SEED_LIMITE_CLI2, tokens["cliente2"]
    )
    _assert_saldo_conta(
        gateway_client, SEED_CONTA_CLI3, SEED_SALDO_CLI3, SEED_LIMITE_CLI3, login(gateway_client, SEED_EMAIL_CLI3)
    )
    _assert_saldo_conta(
        gateway_client, SEED_CONTA_CLI4, SEED_SALDO_CLI4, 0.0, login(gateway_client, SEED_EMAIL_CLI4)
    )
    _assert_saldo_conta(
        gateway_client, SEED_CONTA_CLI5, SEED_SALDO_CLI5, 0.0, login(gateway_client, SEED_EMAIL_CLI5)
    )

    g = tokens["gerente"]
    for cpf in (SEED_CPF_CLI1, SEED_CPF_CLI2):
        det = gateway_client.get_json(f"/api/clientes/{cpf}", token=g)
        assert det["cpf"] == cpf

    lr = gateway_client.request(
        "POST",
        "/api/auth/login",
        json_body={"login": SEED_EMAIL_CLI1, "senha": "tads"},
    )
    assert lr.status_code == 200
