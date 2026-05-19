"""R8 — gerente inativa conta (encerramento lógico) em cliente da saga, não no seed cli2."""

from __future__ import annotations

import pytest

from lib.gateway_client import GatewayClient
from lib.saga_flow import autocadastro_aprovado


@pytest.mark.gateway
@pytest.mark.saga
@pytest.mark.timeout(180)
def test_r8_gerente_encerra_conta_saga_e_deposito_falha(
    gateway_client: GatewayClient,
    tokens: dict,
    http_misc,
    mailhog_url: str,
):
    saga = autocadastro_aprovado(
        gateway_client,
        tokens["gerente"],
        http_misc,
        mailhog_url,
        salario=3500.0,
    )
    numero = saga["numero_conta"]
    tok_cli = saga["access_token"]

    enc = gateway_client.request("DELETE", f"/api/contas/{numero}", token=tokens["gerente"])
    assert enc.status_code == 204, enc.text

    for op, body in (
        ("depositar", {"valor": 10.0}),
        ("sacar", {"valor": 1.0}),
        ("transferir", {"numeroContaDestino": "1291", "valor": 1.0}),
    ):
        r = gateway_client.request(
            "POST",
            f"/api/contas/{numero}/{op}",
            token=tok_cli,
            json_body=body,
        )
        assert r.status_code in (409, 422), f"{op}: {r.status_code} {r.text}"
