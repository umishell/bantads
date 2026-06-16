"""Reboot completo (PG + Mongo) via gateway."""

from __future__ import annotations

from lib.gateway_client import GatewayClient


def integration_reboot(gateway_client: GatewayClient, profile: str = "full") -> None:
    r = gateway_client.request(
        "GET",
        "/api/integration/reboot",
        params={"profile": profile} if profile != "full" else None,
    )
    assert r.status_code == 200, f"integration reboot: {r.status_code} {r.text}"
