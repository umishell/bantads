"""R2, R3, R4, R6 — login, tela inicial do cliente, perfil e regras de saque."""

from __future__ import annotations

import uuid

import pytest

from lib.gateway_client import GatewayClient
from lib.seed_data import SEED_EMAIL_CLI1


@pytest.mark.gateway
def test_r2_login_credenciais_invalidas_401(gateway_client: GatewayClient):
    r = gateway_client.request(
        "POST",
        "/api/auth/login",
        json_body={"login": SEED_EMAIL_CLI1, "senha": "senha-errada"},
    )
    assert r.status_code == 401, r.text


@pytest.mark.gateway
def test_r3_cliente_saldo_limite_e_disponivel(gateway_client: GatewayClient, tokens: dict, seed_contas: dict):
    n1 = seed_contas["numero_cli1"]
    saldo = gateway_client.get_json(f"/api/contas/{n1}/saldo", token=tokens["cliente"])
    assert saldo["numero"] == n1
    assert "saldo" in saldo
    assert "limite" in saldo
    assert "saldoDisponivel" in saldo
    disponivel = float(saldo["saldo"]) + float(saldo["limite"])
    assert float(saldo["saldoDisponivel"]) == pytest.approx(disponivel, rel=1e-4)


@pytest.mark.gateway
def test_r4_alterar_perfil_reflete_na_consulta(
    gateway_client: GatewayClient,
    tokens: dict,
    seed_cli1_ids: dict,
    seed_contas: dict,
):
    cpf = seed_cli1_ids["cpf_cli1"]
    novo_nome = f"Perfil Edit {uuid.uuid4().hex[:6]}"
    body = {
        "nome": novo_nome,
        "telefone": "41997776655",
        "salario": 2600.0,
        "endereco": "Rua Atualizada",
        "cidade": "Curitiba",
        "estado": "PR",
        "cep": "80000000",
    }
    r = gateway_client.request("PUT", f"/api/clientes/{cpf}", token=tokens["cliente"], json_body=body)
    assert r.status_code == 200, r.text
    det = gateway_client.get_json(f"/api/clientes/{cpf}", token=tokens["gerente"])
    assert det["nome"] == novo_nome
    assert det["telefone"] == body["telefone"]
    assert det["cidade"] == body["cidade"]
    assert det["estado"] == body["estado"]

    conta = seed_contas["numero_cli1"]
    saldo = gateway_client.get_json(f"/api/contas/{conta}/saldo", token=tokens["cliente"])
    assert float(saldo["limite"]) == pytest.approx(body["salario"] / 2.0, rel=1e-3)

    carteira = gateway_client.get_json("/api/clientes", token=tokens["gerente"])
    linha = next(x for x in carteira if x["cpf"] == cpf)
    assert linha["gerenteNome"]
    assert len(str(linha["gerenteNome"]).strip()) >= 2


@pytest.mark.gateway
def test_r6_saque_saldo_insuficiente_retorna_422(
    gateway_client: GatewayClient,
    tokens: dict,
    seed_contas: dict,
):
    """Saque acima do saldo+limite disponível deve falhar (R6)."""
    numero = seed_contas["numero_cli1"]
    r = gateway_client.request(
        "POST",
        f"/api/contas/{numero}/sacar",
        token=tokens["cliente"],
        json_body={"valor": 999_999.99},
    )
    assert r.status_code == 422, r.text
    assert "insuficiente" in r.text.lower() or "saldo" in r.text.lower()


@pytest.mark.gateway
def test_r6_saque_com_limite_conta_negativa_cli2(
    gateway_client: GatewayClient,
    tokens: dict,
    seed_contas: dict,
):
    """R6 — conta com saldo negativo pode sacar até saldo+limite (Cleuddônio)."""
    numero = seed_contas["numero_cli2"]
    antes = gateway_client.get_json(f"/api/contas/{numero}/saldo", token=tokens["cliente2"])
    disponivel = float(antes["saldo"]) + float(antes["limite"])
    assert disponivel > 0
    valor = min(50.0, disponivel - 0.01)
    r = gateway_client.request(
        "POST",
        f"/api/contas/{numero}/sacar",
        token=tokens["cliente2"],
        json_body={"valor": valor},
    )
    assert r.status_code == 200, r.text
