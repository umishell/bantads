"""
R1 / R10 — autocadastro público + aprovação pelo gerente (SAGA via RabbitMQ).

Aguarda estado ``APROVADO``, e-mail no MailHog e login do novo cliente.
"""

from __future__ import annotations

import os
import time
import uuid

import pytest

from lib.cpf import gerar_cpf_valido
from lib.gateway_client import GatewayClient, poll_until
from lib.mailhog import buscar_senha_provisoria


@pytest.mark.saga
@pytest.mark.gateway
def test_saga_aprovacao_autocadastro_mailhog_e_conta(
    gateway_client: GatewayClient,
    tokens: dict,
    http_misc,
    mailhog_url: str,
):
    wait_s = float(os.environ.get("BANTADS_SAGA_WAIT_S", "120"))
    email = f"itest.saga.{uuid.uuid4().hex[:12]}@example.com"
    cpf = gerar_cpf_valido()
    body = {
        "cpf": cpf,
        "email": email,
        "nome": "Cliente Integração Saga",
        "telefone": "41988887777",
        "salario": 5500.0,
        "endereco": "Rua Teste Integração 1",
        "CEP": "80010000",
        "cidade": "Curitiba",
        "estado": "PR",
    }
    r = gateway_client.request("POST", "/api/clientes", json_body=body)
    assert r.status_code == 201, r.text
    created = r.json()
    cid = created["clienteId"]
    assert cid

    g = tokens["gerente"]
    pend = gateway_client.get_json("/api/clientes/pendentes", token=g)
    ids = {str(x.get("id")) for x in pend}
    assert str(cid) in ids, "pendente recém-criado deve aparecer para o gerente"

    apr = gateway_client.request("POST", f"/api/clientes/{cid}/aprovar", token=g, json_body={})
    assert apr.status_code == 202, apr.text

    def cliente_aprovado():
        d = gateway_client.get_json(f"/api/clientes/{cpf}", token=g)
        st = str(d.get("status", ""))
        if "APROVADO" in st.upper():
            return d
        return False

    detalhe = poll_until(cliente_aprovado, timeout_s=wait_s, interval_s=2.0, desc=f"cliente {cpf} → APROVADO (saga)")
    assert detalhe["cpf"] == cpf

    senha, numero_mail = buscar_senha_provisoria(http_misc, mailhog_url, email, timeout_s=wait_s, interval_s=2.0)
    assert len(senha) >= 4
    if numero_mail:
        assert len(numero_mail) == 4

    lr = gateway_client.request("POST", "/api/auth/login", json_body={"login": email, "senha": senha})
    assert lr.status_code == 200, lr.text
    novo_tok = lr.json()["access_token"]

    por = gateway_client.get_json(f"/api/contas/por-cliente/{cid}", token=novo_tok)
    num = str(por["numero"])
    assert len(num) == 4

    saldo = gateway_client.get_json(f"/api/contas/{num}/saldo", token=novo_tok)
    assert "saldo" in saldo
    assert saldo["numero"] == num


@pytest.mark.saga
@pytest.mark.gateway
def test_saga_rejeicao_gerente(
    gateway_client: GatewayClient,
    tokens: dict,
    http_misc,
    mailhog_url: str,
):
    wait_s = float(os.environ.get("BANTADS_SAGA_WAIT_S", "90"))
    email = f"itest.rej.{uuid.uuid4().hex[:12]}@example.com"
    cpf = gerar_cpf_valido()
    body = {
        "cpf": cpf,
        "email": email,
        "nome": "Cliente Rejeitado Teste",
        "telefone": "41988886666",
        "salario": 3000.0,
        "endereco": "Rua Rejeição 2",
        "CEP": "80020000",
        "cidade": "Curitiba",
        "estado": "PR",
    }
    r = gateway_client.request("POST", "/api/clientes", json_body=body)
    assert r.status_code == 201, r.text
    cid = r.json()["clienteId"]
    g = tokens["gerente"]

    rej = gateway_client.request(
        "POST",
        f"/api/clientes/{cid}/rejeitar",
        token=g,
        json_body={"motivo": "motivo automação integração"},
    )
    assert rej.status_code == 200, rej.text

    def cliente_rejeitado():
        d = gateway_client.get_json(f"/api/clientes/{cpf}", token=g)
        if "REJEITADO" in str(d.get("status", "")).upper():
            return True
        return False

    poll_until(cliente_rejeitado, timeout_s=wait_s, interval_s=1.5, desc=f"cliente {cpf} → REJEITADO")

    # E-mail de rejeição (assíncrono via filas) — melhor esforço
    deadline = time.monotonic() + min(wait_s, 60.0)
    found = False
    while time.monotonic() < deadline:
        rr = http_misc.get(f"{mailhog_url}/api/v2/messages", timeout=10.0)
        if rr.status_code == 200 and email.lower() in rr.text.lower() and "não aprovado" in rr.text.lower():
            found = True
            break
        time.sleep(2.0)
    assert found, "E-mail de rejeição não encontrado no MailHog (verifique ms-email / saga)"
