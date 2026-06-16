"""R1 — autocadastro público, mensagem assíncrona e unicidade de CPF."""

from __future__ import annotations

import uuid

import pytest

from lib.autocadastro import body_autocadastro
from lib.cpf import gerar_cpf_valido
from lib.gateway_client import GatewayClient
from lib.seed_data import SEED_CPF_CLI1, SEED_EMAIL_CLI1


@pytest.mark.gateway
def test_autocadastro_publico_sem_bearer_retorna_201(gateway_client: GatewayClient):
    cpf = gerar_cpf_valido()
    body = body_autocadastro(cpf=cpf)
    r = gateway_client.request("POST", "/api/clientes", json_body=body, token=None)
    assert r.status_code == 201, r.text
    j = r.json()
    assert j.get("clienteId")
    assert j.get("cpf") == cpf


@pytest.mark.gateway
def test_autocadastro_mensagem_solicitacao_enviada(gateway_client: GatewayClient):
    body = body_autocadastro(cpf=gerar_cpf_valido())
    r = gateway_client.request("POST", "/api/clientes", json_body=body, token=None)
    assert r.status_code == 201, r.text
    j = r.json()
    assert "solicitação" in j.get("message", "").lower() or "solicitacao" in j.get("message", "").lower()
    avisos = " ".join(j.get("avisos") or []).lower()
    assert "aprovação" in avisos or "aprovacao" in avisos
    assert "senha" in avisos and "e-mail" in avisos or "email" in avisos


@pytest.mark.gateway
def test_autocadastro_cpf_duplicado_retorna_409(gateway_client: GatewayClient):
    body = body_autocadastro(cpf=SEED_CPF_CLI1, email=f"dup.{uuid.uuid4().hex[:8]}@example.com")
    r = gateway_client.request("POST", "/api/clientes", json_body=body, token=None)
    assert r.status_code == 409, r.text
    assert "cpf" in r.text.lower() or "cadastrado" in r.text.lower()


@pytest.mark.gateway
def test_autocadastro_cpf_duplicado_mesmo_pendente_409(gateway_client: GatewayClient):
    cpf = gerar_cpf_valido()
    body = body_autocadastro(cpf=cpf)
    r1 = gateway_client.request("POST", "/api/clientes", json_body=body, token=None)
    assert r1.status_code == 201, r1.text
    body2 = body_autocadastro(cpf=cpf, email=f"outro.{uuid.uuid4().hex[:8]}@example.com")
    r2 = gateway_client.request("POST", "/api/clientes", json_body=body2, token=None)
    assert r2.status_code == 409, r2.text


@pytest.mark.gateway
def test_autocadastro_email_duplicado_retorna_409(gateway_client: GatewayClient):
    body = body_autocadastro(cpf=gerar_cpf_valido(), email=SEED_EMAIL_CLI1)
    r = gateway_client.request("POST", "/api/clientes", json_body=body, token=None)
    assert r.status_code == 409, r.text
    assert "email" in r.text.lower() or "cadastrado" in r.text.lower()
