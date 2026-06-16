"""
R18 — remoção de gerente.

``test_r18_nao_remove_ultimo_gerente_ativo`` usa reboot ``single-gerente`` (não apaga seed da suíte).
"""

from __future__ import annotations

import uuid

import pytest

from lib.cpf import gerar_cpf_valido
from lib.gateway_client import GatewayClient
from lib.integration_reboot import integration_reboot
from lib.saga_flow import login


def _gerentes_ativos(gateway_client: GatewayClient, admin_token: str) -> list[dict]:
    lst = gateway_client.get_json("/api/gerentes", token=admin_token)
    return [g for g in lst if g.get("ativo", True) and str(g.get("tipo", "GERENTE")).upper() == "GERENTE"]


def _criar_gerente(gateway_client: GatewayClient, admin_token: str) -> str:
    cpf = gerar_cpf_valido()
    email = f"ger.tmp.{uuid.uuid4().hex[:8]}@example.com"
    cr = gateway_client.request(
        "POST",
        "/api/gerentes",
        token=admin_token,
        json_body={
            "cpf": cpf,
            "nome": "Gerente Temp Integração",
            "email": email,
            "telefone": "41991112222",
            "senha": "tads",
            "tipo": "GERENTE",
        },
    )
    assert cr.status_code == 201, cr.text
    return cpf


@pytest.mark.gateway
def test_r18_remove_gerente_criado_pelo_admin(gateway_client: GatewayClient, tokens: dict):
    adm = tokens["admin"]
    cpf_novo = _criar_gerente(gateway_client, adm)
    dl = gateway_client.request("DELETE", f"/api/gerentes/{cpf_novo}", token=adm)
    assert dl.status_code == 200, dl.text
    body = dl.json()
    assert body.get("ativo") is False


@pytest.mark.gateway
def test_r18_nao_remove_ultimo_gerente_ativo(gateway_client: GatewayClient):
    integration_reboot(gateway_client, profile="single-gerente")
    adm = login(gateway_client, "adm1@bantads.com.br")

    ativos = _gerentes_ativos(gateway_client, adm)
    assert len(ativos) == 1, "perfil single-gerente deve ter exatamente um gerente ativo"

    cpf_temp = _criar_gerente(gateway_client, adm)
    ativos = _gerentes_ativos(gateway_client, adm)
    assert len(ativos) == 2

    r = gateway_client.request("DELETE", f"/api/gerentes/{cpf_temp}", token=adm)
    assert r.status_code == 200, r.text

    ativos = _gerentes_ativos(gateway_client, adm)
    assert len(ativos) == 1
    ultimo_cpf = ativos[0]["cpf"]
    bloqueio = gateway_client.request("DELETE", f"/api/gerentes/{ultimo_cpf}", token=adm)
    assert bloqueio.status_code == 422, bloqueio.text
    assert "último" in bloqueio.text.lower() or "ultimo" in bloqueio.text.lower()

    integration_reboot(gateway_client, profile="full")
