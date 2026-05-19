"""Health, reboot idempotente parcial, login, logout, introspect."""

from __future__ import annotations

import pytest

from lib.gateway_client import GatewayClient


@pytest.mark.gateway
def test_0_health_gateway(gateway_client: GatewayClient):
    r = gateway_client.request("GET", "/health")
    assert r.status_code == 200
    j = r.json()
    assert j.get("status") == "up"


@pytest.mark.gateway
def test_auth_login_cli1_shape(gateway_client: GatewayClient, tokens: dict):
    r = gateway_client.request(
        "POST",
        "/api/auth/login",
        json_body={"login": "cli1@bantads.com.br", "senha": "tads"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data.get("token_type") == "Bearer"
    assert data.get("access_token")
    assert data.get("tipo") == "CLIENTE" or data.get("usuario", {}).get("tipo") == "CLIENTE"


@pytest.mark.gateway
def test_auth_introspect_fixture_token(gateway_client: GatewayClient, tokens: dict):
    intro = gateway_client.request("GET", "/api/auth/introspect", token=tokens["cliente"])
    assert intro.status_code == 200
    assert intro.json().get("active") is True


@pytest.mark.gateway
def test_auth_introspect_and_logout(gateway_client: GatewayClient):
    """Logout usa um token descartável para não invalidar o JWT da fixture `tokens`."""
    r = gateway_client.request(
        "POST",
        "/api/auth/login",
        json_body={"login": "cli1@bantads.com.br", "senha": "tads"},
    )
    assert r.status_code == 200
    t = r.json()["access_token"]
    intro = gateway_client.request("GET", "/api/auth/introspect", token=t)
    assert intro.status_code == 200
    assert intro.json().get("active") is True

    out = gateway_client.request("POST", "/api/auth/logout", token=t)
    assert out.status_code == 200
    body = out.json()
    assert "cpf" in body or "email" in body

    intro_after = gateway_client.request("GET", "/api/auth/introspect", token=t)
    assert intro_after.status_code == 401, intro_after.text
