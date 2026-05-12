"""R4, R12–R16, R17–R20 — cliente, carteira gerente, admin."""

from __future__ import annotations

import uuid

import pytest

from lib.cpf import gerar_cpf_valido
from lib.gateway_client import GatewayClient


@pytest.mark.gateway
def test_cliente_put_perfil(gateway_client: GatewayClient, tokens: dict, seed_cli1_ids: dict):
    cpf = seed_cli1_ids["cpf_cli1"]
    body = {
        "nome": f"Cliente Um Edit {uuid.uuid4().hex[:6]}",
        "telefone": "41997776655",
        "salario": 2600.0,
        "endereco": "Rua Atualizada",
        "cidade": "Curitiba",
        "estado": "PR",
        "cep": "80000000",
    }
    r = gateway_client.request("PUT", f"/api/clientes/{cpf}", token=tokens["cliente"], json_body=body)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j.get("nome") == body["nome"]


@pytest.mark.gateway
def test_gerente_carteira_e_filtros(gateway_client: GatewayClient, tokens: dict):
    g = tokens["gerente"]
    r1 = gateway_client.request("GET", "/api/clientes", token=g)
    assert r1.status_code == 200
    r2 = gateway_client.request("GET", "/api/clientes", token=g, params={"filtro": "melhores_clientes"})
    assert r2.status_code == 200


@pytest.mark.gateway
def test_admin_gerentes_crud_e_stats(gateway_client: GatewayClient, tokens: dict):
    adm = tokens["admin"]
    lst = gateway_client.get_json("/api/gerentes", token=adm)
    assert isinstance(lst, list)
    assert len(lst) >= 1

    stats = gateway_client.get_json("/api/gerentes/stats", token=adm)
    assert isinstance(stats, list)

    rep = gateway_client.get_json("/api/clientes/report", token=adm)
    assert isinstance(rep, list)

    cpf_novo = gerar_cpf_valido()
    email = f"ger.int.{uuid.uuid4().hex[:8]}@example.com"
    body = {
        "cpf": cpf_novo,
        "nome": "Gerente Automação",
        "email": email,
        "telefone": "41991112222",
        "senha": "tads",
        "tipo": "GERENTE",
    }
    cr = gateway_client.request("POST", "/api/gerentes", token=adm, json_body=body)
    assert cr.status_code == 201, cr.text

    up = gateway_client.request(
        "PUT",
        f"/api/gerentes/{cpf_novo}",
        token=adm,
        json_body={"nome": "Gerente Automação Alt", "email": email, "senha": "tads"},
    )
    assert up.status_code == 200, up.text

    dl = gateway_client.request("DELETE", f"/api/gerentes/{cpf_novo}", token=adm)
    assert dl.status_code == 200, dl.text


@pytest.mark.gateway
def test_admin_contas_agregados_por_gerente(gateway_client: GatewayClient, tokens: dict):
    r = gateway_client.request("GET", "/api/contas/agregados/por-gerente", token=tokens["admin"])
    assert r.status_code == 200, r.text
    assert isinstance(r.json(), list)
