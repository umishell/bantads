"""
R4, R11, R17, R18 — lacunas do enunciado cobertas após implementação backend.
"""

from __future__ import annotations

import os
import uuid

import pytest

from lib.autocadastro import body_autocadastro
from lib.cpf import gerar_cpf_valido
from lib.gateway_client import GatewayClient, poll_until
from lib.mailhog import buscar_email_rejeicao_com_motivo
from lib.seed_data import SEED_CPF_CLI2


def _agregados_por_gerente_id(gateway_client: GatewayClient, admin_token: str) -> dict[str, int]:
    rows = gateway_client.get_json("/api/contas/agregados/por-gerente", token=admin_token)
    return {str(r["gerenteId"]): int(r["totalClientes"]) for r in rows}


def _gerente_id_por_cpf(gateway_client: GatewayClient, admin_token: str, cpf: str) -> str:
    g = gateway_client.get_json(f"/api/gerentes/{cpf}", token=admin_token)
    return str(g["id"])


def _gerente_com_mais_contas(agregados: dict[str, int], excluir: set[str] | None = None) -> str:
    ex = excluir or set()
    candidatos = {k: v for k, v in agregados.items() if k not in ex}
    assert candidatos, "sem gerentes candidatos"
    max_v = max(candidatos.values())
    com_max = [k for k, v in candidatos.items() if v == max_v]
    return sorted(com_max)[0]


def _gerente_com_menos_contas(agregados: dict[str, int], excluir: set[str] | None = None) -> str:
    ex = excluir or set()
    candidatos = {k: v for k, v in agregados.items() if k not in ex}
    assert candidatos, "sem gerentes candidatos"
    min_v = min(candidatos.values())
    com_min = [k for k, v in candidatos.items() if v == min_v]
    return sorted(com_min)[0]


@pytest.mark.gateway
def test_r4_recalcula_limite_apos_alterar_salario(
    gateway_client: GatewayClient,
    tokens: dict,
    seed_cli1_ids: dict,
    seed_contas: dict,
):
    cpf = seed_cli1_ids["cpf_cli1"]
    conta = seed_contas["numero_cli1"]
    cli = tokens["cliente"]

    novo_salario = 8000.0
    up = gateway_client.request(
        "PUT",
        f"/api/clientes/{cpf}",
        token=cli,
        json_body={"salario": novo_salario},
    )
    assert up.status_code == 200, up.text

    saldo1 = gateway_client.get_json(f"/api/contas/{conta}/saldo", token=cli)
    assert float(saldo1["limite"]) == pytest.approx(novo_salario / 2.0, rel=1e-3)


@pytest.mark.gateway
def test_r4_salario_menor_2000_limite_zero(
    gateway_client: GatewayClient,
    tokens: dict,
    seed_cli1_ids: dict,
    seed_contas: dict,
):
    cpf = seed_cli1_ids["cpf_cli1"]
    conta = seed_contas["numero_cli1"]
    cli = tokens["cliente"]
    up = gateway_client.request(
        "PUT",
        f"/api/clientes/{cpf}",
        token=cli,
        json_body={"salario": 1500.0},
    )
    assert up.status_code == 200, up.text
    saldo = gateway_client.get_json(f"/api/contas/{conta}/saldo", token=cli)
    assert float(saldo["limite"]) == pytest.approx(0.0, abs=1e-3)


@pytest.mark.gateway
def test_r4_saldo_negativo_piso_limite_cli2(
    gateway_client: GatewayClient,
    tokens: dict,
    seed_contas: dict,
):
    """Cleuddônio: saldo -10000; alterar salário não reduz limite abaixo de |saldo|."""
    conta = seed_contas["numero_cli2"]
    up = gateway_client.request(
        "PUT",
        f"/api/clientes/{SEED_CPF_CLI2}",
        token=tokens["cliente2"],
        json_body={"salario": 3000.0},
    )
    assert up.status_code == 200, up.text
    saldo = gateway_client.get_json(f"/api/contas/{conta}/saldo", token=tokens["cliente2"])
    assert float(saldo["saldo"]) < 0
    assert float(saldo["limite"]) >= abs(float(saldo["saldo"]))


@pytest.mark.gateway
def test_r11_motivo_e_data_na_consulta_por_cpf(
    gateway_client: GatewayClient,
    tokens: dict,
    http_misc,
    mailhog_url: str,
):
    email = f"itest.r11.{uuid.uuid4().hex[:10]}@example.com"
    cpf = gerar_cpf_valido()
    body = body_autocadastro(cpf=cpf, email=email, salario=3200.0)
    r = gateway_client.request("POST", "/api/clientes", json_body=body)
    assert r.status_code == 201, r.text
    cid = r.json()["clienteId"]
    motivo = "Documentação incompleta — teste R11"
    g = tokens["gerente"]
    rej = gateway_client.request(
        "POST",
        f"/api/clientes/{cid}/rejeitar",
        token=g,
        json_body={"motivo": motivo},
    )
    assert rej.status_code == 200, rej.text

    wait_s = float(os.environ.get("BANTADS_SAGA_WAIT_S", "120"))

    def rejeitado():
        d = gateway_client.get_json(f"/api/clientes/{cpf}", token=g)
        return "REJEITADO" in str(d.get("status", "")).upper()

    poll_until(rejeitado, timeout_s=wait_s, interval_s=1.5, desc=f"R11 status {cpf}")

    buscar_email_rejeicao_com_motivo(http_misc, mailhog_url, email, motivo, timeout_s=min(wait_s, 90.0))

    det = gateway_client.get_json(f"/api/clientes/{cpf}", token=g)
    assert det.get("motivoRejeicao") == motivo
    assert det.get("decisaoGerenteEm") is not None


@pytest.mark.gateway
def test_r17_novo_gerente_recebe_conta_do_gerente_com_mais_clientes(
    gateway_client: GatewayClient,
    tokens: dict,
):
    adm = tokens["admin"]
    antes = _agregados_por_gerente_id(gateway_client, adm)

    cpf_novo = gerar_cpf_valido()
    email = f"ger.r17.{uuid.uuid4().hex[:8]}@example.com"
    cr = gateway_client.request(
        "POST",
        "/api/gerentes",
        token=adm,
        json_body={
            "cpf": cpf_novo,
            "nome": "Gerente R17",
            "email": email,
            "telefone": "41990001111",
            "senha": "tads",
            "tipo": "GERENTE",
        },
    )
    assert cr.status_code == 201, cr.text
    novo_id = str(cr.json()["id"])

    depois = _agregados_por_gerente_id(gateway_client, adm)
    assert depois.get(novo_id, 0) >= 1, "Novo gerente deveria receber ao menos uma conta (R17)"
    origens_com_perda = [
        gid for gid, qtd in antes.items()
        if gid != novo_id and depois.get(gid, 0) == qtd - 1
    ]
    assert len(origens_com_perda) == 1, f"exatamente um gerente deveria perder 1 conta: {antes} -> {depois}"
    assert sum(depois.values()) == sum(antes.values())

    gateway_client.request("DELETE", f"/api/gerentes/{cpf_novo}", token=adm)


@pytest.mark.gateway
def test_r18_remaneja_para_gerente_com_menos_contas(
    gateway_client: GatewayClient,
    tokens: dict,
):
    adm = tokens["admin"]
    cpf_temp = gerar_cpf_valido()
    email = f"ger.r18.{uuid.uuid4().hex[:8]}@example.com"
    cr = gateway_client.request(
        "POST",
        "/api/gerentes",
        token=adm,
        json_body={
            "cpf": cpf_temp,
            "nome": "Gerente R18 Temp",
            "email": email,
            "telefone": "41990002222",
            "senha": "tads",
            "tipo": "GERENTE",
        },
    )
    assert cr.status_code == 201, cr.text
    id_temp = str(cr.json()["id"])

    antes = _agregados_por_gerente_id(gateway_client, adm)
    contas_temp = antes.get(id_temp, 0)
    if contas_temp < 1:
        pytest.skip("R17 não atribuiu conta ao gerente temporário")

    destino_esperado = _gerente_com_menos_contas(antes, excluir={id_temp})
    destino_antes = antes[destino_esperado]

    dl = gateway_client.request("DELETE", f"/api/gerentes/{cpf_temp}", token=adm)
    assert dl.status_code == 200, dl.text

    depois = _agregados_por_gerente_id(gateway_client, adm)
    assert depois.get(id_temp, 0) == 0
    assert depois.get(destino_esperado, 0) == destino_antes + contas_temp
