"""R5–R7 — ramos de erro e validações de transações (lacunas da auditoria)."""

from __future__ import annotations

import pytest

from lib.gateway_client import GatewayClient
from lib.seed_data import SEED_CONTA_CLI1, SEED_CONTA_CLI2


@pytest.mark.gateway
def test_r7_transferencia_conta_destino_inexistente_404(
    gateway_client: GatewayClient,
    tokens: dict,
    seed_contas: dict,
):
    n1 = seed_contas["numero_cli1"]
    r = gateway_client.request(
        "POST",
        f"/api/contas/{n1}/transferir",
        token=tokens["cliente"],
        json_body={"numeroContaDestino": "0000", "valor": 1.0},
    )
    assert r.status_code == 404, r.text


@pytest.mark.gateway
def test_r7_transferencia_saldo_insuficiente_422(
    gateway_client: GatewayClient,
    tokens: dict,
    seed_contas: dict,
):
    n1 = seed_contas["numero_cli1"]
    r = gateway_client.request(
        "POST",
        f"/api/contas/{n1}/transferir",
        token=tokens["cliente"],
        json_body={"numeroContaDestino": SEED_CONTA_CLI2, "valor": 999_999.99},
    )
    assert r.status_code == 422, r.text


@pytest.mark.gateway
def test_r7_cliente_nao_transfere_da_conta_alheia_403(
    gateway_client: GatewayClient,
    tokens: dict,
    seed_contas: dict,
):
    """Path = conta de origem; cli1 não pode usar número da conta do cli2."""
    n2 = seed_contas["numero_cli2"]
    r = gateway_client.request(
        "POST",
        f"/api/contas/{n2}/transferir",
        token=tokens["cliente"],
        json_body={"numeroContaDestino": SEED_CONTA_CLI1, "valor": 1.0},
    )
    assert r.status_code == 403, r.text


@pytest.mark.gateway
def test_r5_deposito_valor_zero_400(gateway_client: GatewayClient, tokens: dict, seed_contas: dict):
    n1 = seed_contas["numero_cli1"]
    r = gateway_client.request(
        "POST",
        f"/api/contas/{n1}/depositar",
        token=tokens["cliente"],
        json_body={"valor": 0},
    )
    assert r.status_code == 400, r.text


@pytest.mark.gateway
def test_r6_saque_valor_negativo_400(gateway_client: GatewayClient, tokens: dict, seed_contas: dict):
    n1 = seed_contas["numero_cli1"]
    r = gateway_client.request(
        "POST",
        f"/api/contas/{n1}/sacar",
        token=tokens["cliente"],
        json_body={"valor": -5.0},
    )
    assert r.status_code == 400, r.text


@pytest.mark.gateway
def test_r4_cliente_nao_altera_perfil_de_outro_cpf_403(
    gateway_client: GatewayClient,
    tokens: dict,
    seed_cli1_ids: dict,
):
    cpf_outro = seed_cli1_ids["cpf_cli2"]
    r = gateway_client.request(
        "PUT",
        f"/api/clientes/{cpf_outro}",
        token=tokens["cliente"],
        json_body={"nome": "Tentativa inválida", "salario": 3000.0},
    )
    assert r.status_code == 403, r.text
