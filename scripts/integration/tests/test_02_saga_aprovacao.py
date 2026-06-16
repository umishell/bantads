"""
R1 / R10 — autocadastro público + aprovação pelo gerente (SAGA via RabbitMQ).

Aguarda estado ``APROVADO``, e-mail no MailHog e login do novo cliente.
"""

from __future__ import annotations

import os
import uuid

import pytest

from lib.cpf import gerar_cpf_valido
from lib.gateway_client import GatewayClient, poll_until
from lib.mailhog import buscar_email_falha_saga, buscar_email_rejeicao_com_motivo, buscar_senha_provisoria


@pytest.mark.saga
@pytest.mark.gateway
@pytest.mark.timeout(150)
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

    adm = tokens["admin"]
    ag_antes = {
        str(a["gerenteId"]): int(a["totalClientes"])
        for a in gateway_client.get_json("/api/contas/agregados/por-gerente", token=adm)
    }
    min_antes = min(ag_antes.values()) if ag_antes else 0
    candidatos_min = {gid for gid, n in ag_antes.items() if n == min_antes}

    apr = gateway_client.request("POST", f"/api/clientes/{cid}/aprovar", token=g, json_body={})
    assert apr.status_code == 200, apr.text

    pending: dict[str, str] = {"status": "?"}

    def cliente_aprovado():
        d = gateway_client.get_json(f"/api/clientes/{cpf}", token=g)
        st = str(d.get("status", ""))
        pending["status"] = st
        if "APROVADO" in st.upper():
            return d
        return False

    detalhe = poll_until(
        cliente_aprovado,
        timeout_s=wait_s,
        interval_s=2.0,
        desc=f"cliente {cpf} → APROVADO (saga)",
        log_pending=lambda: f"status={pending['status']}",
    )
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

    ag_depois = {
        str(a["gerenteId"]): int(a["totalClientes"])
        for a in gateway_client.get_json("/api/contas/agregados/por-gerente", token=adm)
    }
    ganhou = [gid for gid in ag_depois if ag_depois.get(gid, 0) == ag_antes.get(gid, 0) + 1]
    assert ganhou, "algum gerente deveria ganhar exatamente um cliente (R10)"
    assert set(ganhou) & candidatos_min, "conta atribuída a gerente com menor carteira antes da aprovação (R10)"

    saldo = gateway_client.get_json(f"/api/contas/{num}/saldo", token=novo_tok)
    assert "saldo" in saldo
    assert saldo["numero"] == num
    # R10: salário >= 2000 → limite = metade do salário
    assert float(saldo["limite"]) == pytest.approx(5500.0 / 2, rel=1e-3)


@pytest.mark.saga
@pytest.mark.gateway
@pytest.mark.timeout(120)
def test_saga_rejeicao_gerente(
    gateway_client: GatewayClient,
    tokens: dict,
    http_misc,
    mailhog_url: str,
):
    wait_s = float(os.environ.get("BANTADS_SAGA_WAIT_S", "120"))
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

    pending_rej: dict[str, str] = {"status": "?"}

    def cliente_rejeitado():
        d = gateway_client.get_json(f"/api/clientes/{cpf}", token=g)
        st = str(d.get("status", ""))
        pending_rej["status"] = st
        if "REJEITADO" in st.upper():
            return True
        return False

    poll_until(
        cliente_rejeitado,
        timeout_s=wait_s,
        interval_s=1.5,
        desc=f"cliente {cpf} → REJEITADO",
        log_pending=lambda: f"status={pending_rej['status']}",
    )

    motivo = "motivo automação integração"
    buscar_email_rejeicao_com_motivo(http_misc, mailhog_url, email, motivo, timeout_s=min(wait_s, 90.0))

    det = gateway_client.get_json(f"/api/clientes/{cpf}", token=g)
    assert "REJEITADO" in str(det.get("status", "")).upper()
    assert det.get("motivoRejeicao")
    assert det.get("decisaoGerenteEm")


@pytest.mark.saga
@pytest.mark.gateway
@pytest.mark.timeout(180)
def test_saga_falha_aprovacao_email_e_volta_pendente(
    gateway_client: GatewayClient,
    tokens: dict,
    http_misc,
    mailhog_url: str,
):
    """R1: falha em processo interno após aprovação — e-mail e cadastro permanece pendente."""
    wait_s = float(os.environ.get("BANTADS_SAGA_WAIT_S", "120"))
    email = f"itest.saga-fail.{uuid.uuid4().hex[:10]}@example.com"
    cpf = gerar_cpf_valido()
    body = {
        "cpf": cpf,
        "email": email,
        "nome": "Cliente Saga Falha",
        "telefone": "41988885555",
        "salario": 4000.0,
        "endereco": "Rua Falha Saga",
        "CEP": "80030000",
        "cidade": "Curitiba",
        "estado": "PR",
    }
    r = gateway_client.request("POST", "/api/clientes", json_body=body)
    assert r.status_code == 201, r.text
    cid = r.json()["clienteId"]
    g = tokens["gerente"]

    apr = gateway_client.request("POST", f"/api/clientes/{cid}/aprovar", token=g, json_body={})
    assert apr.status_code == 200, apr.text

    pending: dict[str, str] = {"status": "?"}

    def volta_pendente():
        d = gateway_client.get_json(f"/api/clientes/{cpf}", token=g)
        st = str(d.get("status", "")).upper()
        pending["status"] = st
        return "PENDENTE" in st or "PEND" in st

    poll_until(
        volta_pendente,
        timeout_s=wait_s,
        interval_s=2.0,
        desc=f"cliente {cpf} volta a pendente após falha saga",
        log_pending=lambda: f"status={pending['status']}",
    )

    buscar_email_falha_saga(http_misc, mailhog_url, email, timeout_s=wait_s)
