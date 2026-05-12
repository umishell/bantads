"""401/403 do gateway (ACL mínimo)."""

from __future__ import annotations

import pytest

from lib.gateway_client import GatewayClient


@pytest.mark.gateway
def test_sem_bearer_retorna_401(gateway_client: GatewayClient):
    """Não depende de contas seed: o gateway deve barrar antes do upstream."""
    r = gateway_client.request("GET", "/api/contas/1234/saldo", token=None)
    assert r.status_code == 401


@pytest.mark.gateway
def test_cliente_nao_acessa_pendentes_403(gateway_client: GatewayClient, tokens: dict):
    r = gateway_client.request("GET", "/api/clientes/pendentes", token=tokens["cliente"])
    assert r.status_code == 403
