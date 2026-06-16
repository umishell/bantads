"""Fluxos de autocadastro + saga para testes de integração."""

from __future__ import annotations

import os
import uuid
from typing import Any

import httpx

from lib.autocadastro import body_autocadastro
from lib.cpf import gerar_cpf_valido
from lib.gateway_client import GatewayClient, poll_until
from lib.mailhog import buscar_senha_provisoria


def login(gateway_client: GatewayClient, email: str, senha: str = "tads") -> str:
    resp = gateway_client.post_json("/api/auth/login", {"login": email, "senha": senha}, expect=200)
    tok = resp.json().get("access_token")
    assert tok, "login sem access_token"
    return str(tok)


def autocadastro_aprovado(
    gateway_client: GatewayClient,
    gerente_token: str,
    http_misc: httpx.Client,
    mailhog_url: str,
    *,
    email: str | None = None,
    salario: float = 5500.0,
) -> dict[str, Any]:
    """Cria pendente, aprova saga e retorna clienteId, cpf, email, access_token, numero_conta."""
    wait_s = float(os.environ.get("BANTADS_SAGA_WAIT_S", "120"))
    mail = email or f"itest.saga.{uuid.uuid4().hex[:12]}@example.com"
    cpf = gerar_cpf_valido()
    body = body_autocadastro(cpf=cpf, email=mail, salario=salario)
    r = gateway_client.request("POST", "/api/clientes", json_body=body)
    assert r.status_code == 201, r.text
    cid = str(r.json()["clienteId"])

    apr = gateway_client.request("POST", f"/api/clientes/{cid}/aprovar", token=gerente_token, json_body={})
    assert apr.status_code == 200, apr.text

    pending: dict[str, str] = {"status": "?"}

    def aprovado():
        d = gateway_client.get_json(f"/api/clientes/{cpf}", token=gerente_token)
        st = str(d.get("status", ""))
        pending["status"] = st
        return "APROVADO" in st.upper()

    poll_until(
        aprovado,
        timeout_s=wait_s,
        interval_s=2.0,
        desc=f"cliente {cpf} → APROVADO",
        log_pending=lambda: f"status={pending['status']}",
    )

    senha, _ = buscar_senha_provisoria(http_misc, mailhog_url, mail, timeout_s=wait_s, interval_s=2.0)
    tok = login(gateway_client, mail, senha)
    por = gateway_client.get_json(f"/api/contas/por-cliente/{cid}", token=tok)
    numero = str(por["numero"])
    return {
        "clienteId": cid,
        "cpf": cpf,
        "email": mail,
        "access_token": tok,
        "numero_conta": numero,
    }
