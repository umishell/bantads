"""R15, R16, R19 — dashboard e relatórios do administrador."""

from __future__ import annotations

import pytest

from lib.gateway_client import GatewayClient


@pytest.mark.gateway
def test_r15_stats_dashboard_campos(gateway_client: GatewayClient, tokens: dict):
    stats = gateway_client.get_json("/api/gerentes/stats", token=tokens["admin"])
    assert isinstance(stats, list)
    assert len(stats) >= 1
    row = stats[0]
    for key in (
        "gerenteId",
        "cpf",
        "nome",
        "email",
        "totalClientes",
        "somaSaldosPositivos",
        "somaSaldosNegativos",
    ):
        assert key in row, f"campo {key} ausente em stats"


@pytest.mark.gateway
def test_r15_stats_ordenado_saldos_positivos_desc(gateway_client: GatewayClient, tokens: dict):
    stats = gateway_client.get_json("/api/gerentes/stats", token=tokens["admin"])
    positivos = [float(x["somaSaldosPositivos"]) for x in stats]
    assert positivos == sorted(positivos, reverse=True)


@pytest.mark.gateway
def test_r16_relatorio_clientes_campos(gateway_client: GatewayClient, tokens: dict):
    rep = gateway_client.get_json("/api/clientes/report", token=tokens["admin"])
    assert isinstance(rep, list)
    assert len(rep) >= 1
    row = rep[0]
    for key in (
        "cpfCliente",
        "nomeCliente",
        "emailCliente",
        "salario",
        "numeroConta",
        "saldo",
        "limite",
        "cpfGerente",
        "nomeGerente",
    ):
        assert key in row, f"campo {key} ausente no relatório"


@pytest.mark.gateway
def test_r16_relatorio_ordenado_nome_cliente(gateway_client: GatewayClient, tokens: dict):
    rep = gateway_client.get_json("/api/clientes/report", token=tokens["admin"])
    nomes = [str(x["nomeCliente"]) for x in rep]
    assert nomes == sorted(nomes, key=str.casefold)


@pytest.mark.gateway
def test_r16_relatorio_via_filtro_adm(gateway_client: GatewayClient, tokens: dict):
    rep = gateway_client.get_json(
        "/api/clientes",
        token=tokens["admin"],
        params={"filtro": "adm_relatorio_clientes"},
    )
    assert isinstance(rep, list)
    assert len(rep) >= 1


@pytest.mark.gateway
def test_r16_report_equivalente_ao_filtro_adm(gateway_client: GatewayClient, tokens: dict):
    adm = tokens["admin"]
    via_report = gateway_client.get_json("/api/clientes/report", token=adm)
    via_filtro = gateway_client.get_json(
        "/api/clientes",
        token=adm,
        params={"filtro": "adm_relatorio_clientes"},
    )
    cpfs_report = {str(x["cpfCliente"]) for x in via_report}
    cpfs_filtro = {str(x["cpfCliente"]) for x in via_filtro}
    assert cpfs_report == cpfs_filtro
    assert len(cpfs_report) >= 5
