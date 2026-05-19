# Tutor — Fluxos transacionais do BANTADS (Swagger / OpenAPI)

Mapa para testar **transações de negócio** via **Swagger/OpenAPI**, alinhado ao enunciado (`all bantads intructions.md`) e à suíte de integração atual.

**Complementos:**
- [`httpieTests.md`](httpieTests.md) — mesmo fluxo pelo **gateway** (`/api/...`) com HTTPie Desktop
- [`guia-completo-testes-integracao.md`](guia-completo-testes-integracao.md) — ~62 testes pytest automatizados
- [`integrationTests.md`](integrationTests.md) — como executar a suíte

---

## Como iniciar o OpenAPI / Swagger UI

### Pré-requisito
- **Docker Desktop** ligado.

### 1) Levantar o ambiente

```powershell
docker compose up --build -d
```

Confira `docker compose ps` (containers **running**).

### 2) URLs do Swagger UI

| Microsserviço | Swagger UI |
|---------------|------------|
| **ms-auth** | `http://localhost:8081/auth/swagger-ui.html` |
| **ms-cliente** | `http://localhost:8082/clientes/swagger-ui.html` |
| **ms-conta** | `http://localhost:8083/contas/swagger-ui.html` |
| **ms-gerente** | `http://localhost:8084/gerentes/swagger-ui.html` |

Índice com links: **`http://localhost/docs`**

### 3) Controles na interface

1. **Tags** — agrupam endpoints.
2. Clique no método (`GET`, `POST`, …).
3. **Try it out** — edita parâmetros e body.
4. **Parameters** — path/query (`{numero}`, `{cpf}`, `{id}`).
5. **Request body** — JSON `application/json`.
6. **Authorize** — JWT (cole só o token, sem `Bearer `).
7. **Execute** — envia e mostra **Code** + body.

### 4) OpenAPI JSON (Postman/Insomnia)

- `http://localhost:8081/auth/v3/api-docs`
- `http://localhost:8082/clientes/v3/api-docs`
- `http://localhost:8083/contas/v3/api-docs`
- `http://localhost:8084/gerentes/v3/api-docs`

### 5) Swagger 808x vs Gateway `/api/...`

| Onde testar | Comportamento |
|-------------|---------------|
| **Swagger em `localhost:808x`** | Requisição **direta** ao microsserviço; Spring costuma ser permissivo (`permitAll`). |
| **Gateway `localhost/api/...`** | Igual ao **Angular** e à suíte pytest: JWT + **perfis** + **ACL de conta** (`conta-cliente-guard`). |

Para `401`/`403` reais do app, use gateway (HTTPie, curl ou pytest).

---

## 0) Convenções

### Perfis JWT
- `CLIENTE`, `GERENTE`, `ADMINISTRADOR`

### URLs base
- **Gateway:** `http://localhost/api`
- **ms-auth:** `http://localhost:8081/auth`
- **ms-cliente:** `http://localhost:8082/clientes`
- **ms-conta:** `http://localhost:8083/contas`
- **ms-gerente:** `http://localhost:8084/gerentes`

### Header
`Authorization: Bearer <JWT>`

### Seed (após reboot — senha `tads`)

| Papel | Login | CPF (se cliente) | Conta |
|-------|-------|------------------|-------|
| Cliente 1 | `cli1@bantads.com.br` | 12912861012 | **1291** |
| Cliente 2 | `cli2@bantads.com.br` | 09506382000 | **0950** (saldo negativo) |
| Cliente 3 | `cli3@bantads.com.br` | 85733854057 | **8573** |
| Gerente 1 | `ger1@bantads.com.br` | — | — |
| Admin | `adm1@bantads.com.br` | — | — |

---

## 1) Setup repetível (antes dos fluxos)

### Opção A — Reboot completo (recomendado)

Igual ao `conftest.py` da suíte de integração:

1. Navegador ou HTTPie: `GET http://localhost/api/integration/reboot`
2. Esperado: `200` — reinicia PostgreSQL (cliente, gerente, conta) + Mongo (auth) e repõe o seed do PDF.

Não depende do Swagger; pode ser a primeira requisição da sessão.

### Opção B — Swagger (só auth)

1. Abra `http://localhost:8081/auth/swagger-ui.html`
2. `GET /reboot` → **Execute** → `200` (só usuários Mongo)
3. `POST /login` com `ger1@bantads.com.br` / `tads` → copie `access_token`

> Para transações com saldos/contas corretos, use **Opção A**. `GET /api/auth/reboot` sozinho **não** repõe contas no PostgreSQL.

### Depois do login

Nos Swaggers de **ms-cliente**, **ms-conta** e **ms-gerente**: **Authorize** → cole o JWT → teste os endpoints.

---

## 2) Visão geral dos fluxos

Fluxos por requisito **R1–R20**. Marcadores:

- **Síncrono** — efeito na mesma resposta HTTP (ou imediato no banco).
- **Assíncrono (SAGA)** — RabbitMQ + `ms-saga-orchestrator` + MailHog.

---

## 3) R2 — Login [Síncrono]

### Na interface Swagger UI
**ms-auth** → `POST /login` → body:

```json
{ "login": "cli1@bantads.com.br", "senha": "tads" }
```

**Esperado:** `200` — `access_token`, `token_type`, `tipo`, `usuario`.

**Gateway:** `POST http://localhost/api/auth/login`

---

## 4) R2 — Logout e introspect [Síncrono]

**Authorize** com JWT válido.

| Ação | Endpoint | Esperado |
|------|----------|----------|
| Logout | `POST /logout` | `200` |
| Introspect | `GET /introspect` | `200` com `active`, `perfil`, `expiraEm` |

Após logout, introspect com o mesmo token → `401`.

---

## 5) R1 — Autocadastro e saga [Fase 2 assíncrona]

### 5.1 Autocadastro (público)

**ms-cliente** → `POST /clientes` — **sem** Authorize.

```json
{
  "cpf": "52998224725",
  "email": "novocliente.unique@example.com",
  "nome": "Fulano da Silva",
  "telefone": "41999998888",
  "salario": 5000.00,
  "endereco": "Rua das Flores 100",
  "CEP": "80010000",
  "cidade": "Curitiba",
  "estado": "PR"
}
```

**Esperado:** `201` — `clienteId`, estado `PENDENTE_APROVACAO`.

**Erros:** CPF/e-mail duplicados → `409`.

### 5.2 Pendentes e aprovar (gerente)

1. Login gerente no **ms-auth** → token no **ms-cliente** Authorize.
2. `GET /pendentes` → `200`
3. `POST /{id}/aprovar` → `202`

**Checklist saga:**
- RabbitMQ (`localhost:15672`)
- MailHog (`localhost:8025`) — senha provisória
- Cliente `APROVADO`, conta criada, login no **ms-auth**

### 5.3 Rejeitar

`POST /{id}/rejeitar`

```json
{ "motivo": "Usuário não é interessante para o banco" }
```

**Esperado:** `200`, estado `REJEITADO`, e-mail com motivo.

---

## 6) R5 — Depósito [Síncrono]

**ms-conta** → `POST /{numero}/depositar`

```json
{ "valor": 51.44 }
```

Use conta seed **`1291`** (cli1) após reboot completo.

**Gateway:** cliente só deposita na **própria** conta → outra conta retorna `403`.

**Erros:** valor `0` → `400`.

---

## 7) R6 — Saque [Síncrono]

`POST /{numero}/sacar` — body `{ "valor": ... }`

| Status | Motivo |
|--------|--------|
| `200` | Saldo + limite permitem |
| `422` | Saldo insuficiente |
| `409` | Conta inativa |
| `400` | Valor inválido (ex.: negativo) |
| `403` | Gateway: conta de outro cliente |

**Teste saldo negativo:** conta **`0950`**, login cli2.

---

## 8) R7 — Transferência [Síncrono]

`POST /{numero}/transferir`

```json
{ "numeroContaDestino": "0950", "valor": 25.00 }
```

(origem `1291` → destino `0950` no seed)

| Status | Motivo |
|--------|--------|
| `200` | OK |
| `400` | Origem = destino |
| `404` | Destino inexistente (ex.: `0000`) |
| `422` | Valor acima do disponível |
| `403` | Gateway: path não é conta do token |

**Conferir:** extrato com `contraparteContaNumero`, `saldoApos`.

---

## 9) R8 — Extrato [Síncrono]

`GET /{numero}/extrato?dataInicio=YYYY-MM-DD&dataFim=YYYY-MM-DD`

Sem datas: últimos 30 dias.

---

## 10) R3 — Saldo [Síncrono]

`GET /{numero}/saldo` → `saldo`, `limite`, `saldoDisponivel`

---

## 11) Consultas auxiliares (ms-conta)

| Endpoint | Uso |
|----------|-----|
| `GET /{numero}` | Detalhe da conta |
| `GET /por-cliente/{clienteId}` | Número a partir do UUID (obter `id` em `GET /clientes/{cpf}`) |
| `GET /contas` | Listagem (`?gerenteId=` opcional) |
| `GET /top3` | Top 3 saldos (**R14**) |
| `GET /agregados/por-gerente` | Agregados admin (**R15**) |

---

## 12) R14 — Melhores clientes

- **ms-conta:** `GET /top3`
- **ms-cliente:** `GET /clientes?filtro=melhores_clientes` (carteira enriquecida)

---

## 13) Limite e encerramento (ms-conta)

### PATCH limite (gerente)
`PATCH /{numero}/limite` — `{ "limite": 123.45 }` → `204`

### DELETE conta (gerente — R8)
`DELETE /{numero}` → `204`

Depois: depósito/saque/transferência do cliente → falha (`409`/`422`).

> Use conta de cliente **novo** (saga), não destrua a seed `0950` usada em outros testes.

---

## 14) R9 — Pendentes

`GET /pendentes` (gerente) — equivalente gateway: `?filtro=para_aprovar` em `GET /clientes`.

---

## 15) R10 — Aprovar [SAGA]

`POST /{id}/aprovar` → `202` — ver checklist §5.2.

---

## 16) R12 / R13 — Consultas cliente

| Endpoint | Perfil | Notas |
|----------|--------|-------|
| `GET /{cpf}` | Gerente / dono | Detalhe |
| `GET /clientes` | Gerente | Carteira (aprovados) |
| `?filtro=melhores_clientes` | Gerente | Até 3, por saldo |
| `?filtro=adm_relatorio_clientes` | Admin | Relatório (**R16**) |

Inclua Bearer quando o controller propagar para `ms-conta` / `ms-gerente`.

---

## 17) R4 — Alterar perfil [Síncrono + recálculo de limite]

`PUT /clientes/{cpf}`

```json
{
  "nome": "Novo Nome",
  "salario": 8000.00,
  "cidade": "Curitiba",
  "estado": "PR"
}
```

**Implementação atual (desde leva 5.18):**
- `ms-cliente` persiste cadastro.
- Se `salario` mudar e cliente estiver `APROVADO`, chama `ms-conta` (`recalcular-limite`): metade do salário; salário &lt; 2000 → limite 0; saldo negativo → piso no |saldo|.

**Gateway:** cliente só pode `PUT` no **próprio** CPF → outro CPF retorna `403`.

**Conferir:** `GET /contas/{numero}/saldo` após alterar salário.

---

## 18) R17 / R18 / R19 / R20 — Gerentes

**ms-gerente** — operações admin com JWT **ADMINISTRADOR**.

| Ação | Método | Notas |
|------|--------|-------|
| Listar | `GET /gerentes` | Ordem por nome (**R19**) |
| Criar | `POST /gerentes` | Body com `cpf`, `nome`, `email`, `senha`, `tipo` |
| Alterar | `PUT /{cpf}` | Nome/e-mail/senha |
| Remover | `DELETE /{cpf}` | Soft delete; último ativo → `422` (**R18**) |

**Gaps conhecidos:**
- Criar gerente pode não criar usuário no Mongo até saga dedicada existir — valide login.
- **R20 senha:** PUT aceita senha; sincronização plena com `ms-auth` pode ainda estar parcial — teste login após alterar.

**R17/R18 (regras de remanejamento):** validadas na suíte pytest (`test_13`, `test_99`); no Swagger manual, compare contagens em `GET /contas/agregados/por-gerente` antes/depois.

---

## 19) R19 — Listagem gerentes

`GET /gerentes` — ativos, ordenados por `nome`, campo `telefone`.

---

## 20) R15 — Dashboard admin

`GET /gerentes/stats` — itens com `totalClientes`, `somaSaldosPositivos`, `somaSaldosNegativos`, ordenação por saldos positivos.

---

## 21) R16 — Relatório admin

`GET /clientes/report` — requer Bearer **ADMIN**.

Alternativa: `GET /clientes?filtro=adm_relatorio_clientes` (mesmo conjunto de clientes no gateway).

Ordenação: nome do cliente ascendente.

---

## 22) ACL no gateway (não aparece no Swagger 808x)

Teste via `http://localhost/api/...` (HTTPie ou pytest):

| Cenário | HTTP |
|---------|------|
| Sem token | `401` |
| Cliente em pendentes / report / POST gerente | `403` |
| Gerente em stats / report admin | `403` |
| Admin em depositar | `403` |
| Cliente em conta alheia (dep/saq/transf) | `403` |
| Cliente PUT perfil de outro CPF | `403` |

Implementação: `gateway/src/conta-cliente-guard.js` + rotas por perfil.

---

## 23) Evidências para avaliação

Para cada fluxo, registre:

1. **Request** — URL, headers, body
2. **Response** — status + JSON principal
3. **Estado** — saldo, extrato, status do cliente
4. **Assíncrono** — fila RabbitMQ + MailHog (sagas)

**Reset entre sessões:** `GET http://localhost/api/integration/reboot`

**Automação:** `.\scripts\run-integration-tests.ps1` — relatórios em `testReports/`.

---

## Documentos relacionados

| Arquivo | Conteúdo |
|---------|----------|
| [`httpieTests.md`](httpieTests.md) | Coleção gateway no HTTPie Desktop |
| [`guia-completo-testes-integracao.md`](guia-completo-testes-integracao.md) | Cada teste pytest explicado |
| [`auditoria-testes-integracao.md`](auditoria-testes-integracao.md) | Cobertura R1–R20 vs lacunas |
| [`integrationTests.md`](integrationTests.md) | Execução da suíte |
| `testReports/corrections/5.18[04-30]*` | Reboot + seed PDF |
| `testReports/corrections/5.18[05-15]*` | Transações com erro + ACL |
