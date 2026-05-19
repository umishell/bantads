"""Payload de autocadastro (R1) para testes de integração."""

from __future__ import annotations

import uuid
from typing import Any


def body_autocadastro(
    *,
    cpf: str,
    email: str | None = None,
    nome: str = "Cliente Teste Integração",
    salario: float = 4500.0,
) -> dict[str, Any]:
    return {
        "cpf": cpf,
        "email": email or f"itest.{uuid.uuid4().hex[:12]}@example.com",
        "nome": nome,
        "telefone": "41988887777",
        "salario": salario,
        "endereco": "Rua Teste 100",
        "CEP": "80010000",
        "cidade": "Curitiba",
        "estado": "PR",
    }
