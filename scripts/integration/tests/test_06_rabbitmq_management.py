"""Sinal de vida do RabbitMQ Management API (não falha a suíte se estiver offline)."""

from __future__ import annotations

import os

import pytest
from httpx import BasicAuth


@pytest.mark.gateway
def test_rabbitmq_management_reachable(http_misc, rabbitmq_api_url: str):
    user = os.environ.get("RABBITMQ_USER", "guest")
    pw = os.environ.get("RABBITMQ_PASSWORD", "guest")
    r = http_misc.get(f"{rabbitmq_api_url}/api/overview", auth=BasicAuth(user, pw), timeout=5.0)
    assert r.status_code == 200, (
        "RabbitMQ Management não respondeu — sagas podem falhar. "
        f"Confira {rabbitmq_api_url} e credenciais (guest/guest por padrão)."
    )
