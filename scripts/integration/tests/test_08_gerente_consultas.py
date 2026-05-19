"""R9, R12, R13, R14, R19 — consultas do gerente e listagens."""

from __future__ import annotations

import pytest

from lib.gateway_client import GatewayClient
from lib.seed_data import SEED_CPF_CLI1


@pytest.mark.gateway
def test_r9_pendentes_lista_campos_para_aprovacao(gateway_client: GatewayClient, tokens: dict):
    pend = gateway_client.get_json("/api/clientes/pendentes", token=tokens["gerente"])
    assert isinstance(pend, list)
    for row in pend[:5]:
        for key in ("id", "cpf", "nome", "salario"):
            assert key in row, f"campo {key} ausente em pendente"


@pytest.mark.gateway
def test_r13_gerente_consulta_cliente_por_cpf(gateway_client: GatewayClient, tokens: dict):
    det = gateway_client.get_json(f"/api/clientes/{SEED_CPF_CLI1}", token=tokens["gerente"])
    assert det["cpf"] == SEED_CPF_CLI1
    assert det.get("nome")
    assert det.get("email")
    assert det.get("status")
    assert "salario" in det


@pytest.mark.gateway
def test_r12_carteira_campos_e_ordenacao_por_nome(gateway_client: GatewayClient, tokens: dict):
    carteira = gateway_client.get_json("/api/clientes", token=tokens["gerente"])
    assert isinstance(carteira, list)
    assert len(carteira) >= 1
    for row in carteira:
        for key in ("cpf", "nome", "cidade", "estado", "conta", "saldo", "limite", "gerenteNome"):
            assert key in row, f"campo {key} ausente na carteira"
        assert row["cidade"]
        assert row["estado"]
    nomes = [str(x["nome"]) for x in carteira]
    assert nomes == sorted(nomes, key=str.casefold)


@pytest.mark.gateway
def test_r14_melhores_clientes_ate_tres_ordenados_por_saldo(gateway_client: GatewayClient, tokens: dict):
    top = gateway_client.get_json(
        "/api/clientes",
        token=tokens["gerente"],
        params={"filtro": "melhores_clientes"},
    )
    assert isinstance(top, list)
    assert 1 <= len(top) <= 3
    for row in top:
        for key in ("cpf", "nome", "cidade", "estado", "saldo"):
            assert key in row, f"campo {key} ausente em melhores_clientes"
    saldos = [float(x["saldo"]) for x in top]
    assert saldos == sorted(saldos, reverse=True)

    top_contas = gateway_client.get_json("/api/contas/top3", token=tokens["gerente"])
    numeros_contas = {str(c["numero"]) for c in top_contas}
    numeros_clientes = {str(x["conta"]) for x in top}
    assert numeros_contas == numeros_clientes, "R14: top3 contas deve coincidir com melhores_clientes"


@pytest.mark.gateway
def test_r9_para_aprovar_filtro_equivalente_pendentes(gateway_client: GatewayClient, tokens: dict):
    g = tokens["gerente"]
    pend = gateway_client.get_json("/api/clientes/pendentes", token=g)
    via_filtro = gateway_client.get_json("/api/clientes", token=g, params={"filtro": "para_aprovar"})
    ids_pend = {str(x["id"]) for x in pend}
    ids_filtro = {str(x["id"]) for x in via_filtro}
    assert ids_pend == ids_filtro


@pytest.mark.gateway
def test_r19_admin_lista_gerentes_ordenada_com_telefone(gateway_client: GatewayClient, tokens: dict):
    lst = gateway_client.get_json("/api/gerentes", token=tokens["admin"])
    gerentes = [g for g in lst if str(g.get("tipo", "GERENTE")).upper() == "GERENTE"]
    assert len(gerentes) >= 1
    nomes = [str(g["nome"]) for g in gerentes]
    assert nomes == sorted(nomes, key=str.casefold)
    for g in gerentes:
        assert g.get("cpf")
        assert g.get("email")
        assert g.get("telefone")
    cpf = gerentes[0]["cpf"]
    det = gateway_client.get_json(f"/api/gerentes/{cpf}", token=tokens["admin"])
    assert det["cpf"] == cpf
    assert det.get("ativo") is True
