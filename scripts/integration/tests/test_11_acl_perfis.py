"""R2 — ACL do gateway por perfil (401/403)."""

from __future__ import annotations

import pytest

from lib.gateway_client import GatewayClient
from lib.seed_data import SEED_CPF_GER1


@pytest.mark.gateway
def test_sem_bearer_retorna_401(gateway_client: GatewayClient):
    r = gateway_client.request("GET", "/api/contas/1234/saldo", token=None)
    assert r.status_code == 401


@pytest.mark.gateway
def test_cliente_nao_acessa_pendentes_403(gateway_client: GatewayClient, tokens: dict):
    r = gateway_client.request("GET", "/api/clientes/pendentes", token=tokens["cliente"])
    assert r.status_code == 403


@pytest.mark.gateway
def test_cliente_nao_acessa_relatorio_admin_403(gateway_client: GatewayClient, tokens: dict):
    r = gateway_client.request("GET", "/api/clientes/report", token=tokens["cliente"])
    assert r.status_code == 403


@pytest.mark.gateway
def test_cliente_nao_cria_gerente_403(gateway_client: GatewayClient, tokens: dict):
    r = gateway_client.request(
        "POST",
        "/api/gerentes",
        token=tokens["cliente"],
        json_body={
            "cpf": "52998224725",
            "nome": "X",
            "email": "x@example.com",
            "telefone": "41991112222",
            "senha": "tads",
        },
    )
    assert r.status_code == 403


@pytest.mark.gateway
def test_gerente_nao_acessa_stats_admin_403(gateway_client: GatewayClient, tokens: dict):
    r = gateway_client.request("GET", "/api/gerentes/stats", token=tokens["gerente"])
    assert r.status_code == 403


@pytest.mark.gateway
def test_gerente_nao_acessa_relatorio_admin_403(gateway_client: GatewayClient, tokens: dict):
    r = gateway_client.request("GET", "/api/clientes/report", token=tokens["gerente"])
    assert r.status_code == 403


@pytest.mark.gateway
def test_admin_nao_posta_deposito_cliente_403(gateway_client: GatewayClient, tokens: dict, seed_contas: dict):
    n1 = seed_contas["numero_cli1"]
    r = gateway_client.request(
        "POST",
        f"/api/contas/{n1}/depositar",
        token=tokens["admin"],
        json_body={"valor": 1.0},
    )
    assert r.status_code == 403


@pytest.mark.gateway
def test_admin_pode_listar_gerentes_200(gateway_client: GatewayClient, tokens: dict):
    r = gateway_client.request("GET", "/api/gerentes", token=tokens["admin"])
    assert r.status_code == 200, r.text


@pytest.mark.gateway
def test_r5_cliente_nao_deposita_em_conta_alheia_403(
    gateway_client: GatewayClient,
    tokens: dict,
    seed_contas: dict,
):
    n2 = seed_contas["numero_cli2"]
    r = gateway_client.request(
        "POST",
        f"/api/contas/{n2}/depositar",
        token=tokens["cliente"],
        json_body={"valor": 1.0},
    )
    assert r.status_code == 403, r.text


@pytest.mark.gateway
def test_r6_cliente_nao_saca_de_conta_alheia_403(
    gateway_client: GatewayClient,
    tokens: dict,
    seed_contas: dict,
):
    n2 = seed_contas["numero_cli2"]
    r = gateway_client.request(
        "POST",
        f"/api/contas/{n2}/sacar",
        token=tokens["cliente"],
        json_body={"valor": 1.0},
    )
    assert r.status_code == 403, r.text


@pytest.mark.gateway
def test_gerente_pode_consultar_gerente_por_cpf_403(gateway_client: GatewayClient, tokens: dict):
    """Listagem por CPF de gerente é rota de administrador."""
    r = gateway_client.request("GET", f"/api/gerentes/{SEED_CPF_GER1}", token=tokens["gerente"])
    assert r.status_code == 403
