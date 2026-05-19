# Tutorial — Testes transacionais no BANTADS com HTTPie Desktop (2026)

Este guia é para testar, no mesmo estilo do front, os endpoints transacionais usando **HTTPie Desktop** e o **API Gateway** (`http://localhost/api/...`).

Complementa:
- [`swaggerTests.md`](swaggerTests.md) — explorar contratos por microsserviço (portas 808x)
- [`guia-completo-testes-integracao.md`](guia-completo-testes-integracao.md) — suíte pytest automatizada (~62 cenários)
- [`integrationTests.md`](integrationTests.md) — como rodar a suíte

Assume a stack Docker no ar (gateway, microsserviços, PostgreSQL, Mongo, RabbitMQ, MailHog).

---

## 1) Pré-requisitos

1. **Docker Desktop** ligado.
2. **HTTPie Desktop** instalado.
3. Stack rodando na raiz do repositório:

```powershell
docker compose up --build -d
```

Após mudanças no gateway ou nos seeds:

```powershell
docker compose build gateway ms-auth ms-cliente ms-conta ms-gerente
docker compose up -d
```

---

## 2) Space, Collection e Environment

1. Crie um **Space** (ex.: “BANTADS”).
2. Crie uma **Collection** (ex.: “Gateway — transacionais”).
3. Variáveis sugeridas:

| Variável | Valor inicial | Uso |
|----------|---------------|-----|
| `gateway` | `http://localhost` | Base de todas as requisições |
| `token_cliente` | (vazio) | JWT do cli1 |
| `token_cliente2` | (vazio) | JWT do cli2 (saldo negativo) |
| `token_gerente` | (vazio) | JWT do ger1 |
| `token_admin` | (vazio) | JWT do adm1 |
| `clienteId` | (vazio) | UUID (autocadastro / consulta gerente) |
| `cpf_cliente` | `12912861012` | CPF seed Catharyna (cli1) |
| `numeroConta` | `1291` | Conta seed cli1 (4 dígitos) |
| `numeroConta_destino` | `0950` | Conta seed cli2 (transferências) |

O HTTPie Desktop não extrai JSON para variáveis automaticamente — copie `access_token`, `clienteId`, etc. das respostas.

---

## 3) Autenticação Bearer

Em requisições protegidas:

1. Painel **Auth** → **Bearer token**
2. Valor: `{{token_cliente}}`, `{{token_gerente}}` ou `{{token_admin}}`

Prefira sempre `{{gateway}}/api/...` (mesmo ponto do Angular e da suíte pytest).

---

## 4) Fluxo base: health + reboot + login

### 4.1 Health (gateway)

- `GET {{gateway}}/health`
- Esperado: `200` com `status: up`

### 4.2 Reboot completo (recomendado)

Reseta **PostgreSQL** (cliente, gerente, conta) e **Mongo** (auth), repovoa o seed do PDF.

- `GET {{gateway}}/api/integration/reboot`
- Auth: nenhum
- Esperado: `200` com JSON listando `ms-gerente`, `ms-cliente`, `ms-conta`, `ms-auth`

Use isto **antes** de qualquer bateria manual longa ou quando saldos/contas não baterem com a tabela abaixo.

> **Só Mongo (legado):** `GET {{gateway}}/api/auth/reboot` recria usuários no `ms-auth`, mas **não** repõe contas/saldos no PostgreSQL. Para testes transacionais, prefira `integration/reboot`.

### 4.3 Dados seed (após reboot)

| Personagem | E-mail login | Senha | CPF | Conta | Saldo (aprox.) |
|------------|--------------|-------|-----|-------|----------------|
| Catharyna (cli1) | `cli1@bantads.com.br` | `tads` | 12912861012 | **1291** | 800 |
| Cleuddônio (cli2) | `cli2@bantads.com.br` | `tads` | 09506382000 | **0950** | -10000 |
| Catianna (cli3) | `cli3@bantads.com.br` | `tads` | 85733854057 | **8573** | -1000 |
| Cutardo (cli4) | `cli4@bantads.com.br` | `tads` | 58872160006 | **5887** | 150000 |
| Coândrya (cli5) | `cli5@bantads.com.br` | `tads` | 76179646090 | **7617** | 1500 |
| Geniéve (ger1) | `ger1@bantads.com.br` | `tads` | — | — | — |
| Adamântio (admin) | `adm1@bantads.com.br` | `tads` | — | — | — |

### 4.4 Login

`POST {{gateway}}/api/auth/login`

**Cliente 1**
```json
{ "login": "cli1@bantads.com.br", "senha": "tads" }
```
→ copie `access_token` para `token_cliente`.

**Cliente 2** (testes de saldo negativo / limite)
```json
{ "login": "cli2@bantads.com.br", "senha": "tads" }
```
→ `token_cliente2`.

**Gerente**
```json
{ "login": "ger1@bantads.com.br", "senha": "tads" }
```

**Administrador**
```json
{ "login": "adm1@bantads.com.br", "senha": "tads" }
```

Resposta típica: `access_token`, `token_type`, `tipo` (`CLIENTE` | `GERENTE` | `ADMINISTRADOR`), `usuario`.

### 4.5 Logout (opcional)

1. `POST {{gateway}}/api/auth/logout` com Bearer do token a revogar → `200`
2. `GET {{gateway}}/api/auth/introspect` com o mesmo token → `401`

---

## 5) R1 — Autocadastro e saga (GERENTE)

### 5.1 Autocadastro (público)

- `POST {{gateway}}/api/clientes`
- Auth: nenhum
```json
{
  "cpf": "52998224725",
  "email": "novocliente.desktop@example.com",
  "nome": "Fulano da Silva",
  "telefone": "41999998888",
  "salario": 5000.00,
  "endereco": "Rua das Flores 100",
  "CEP": "80010000",
  "cidade": "Curitiba",
  "estado": "PR"
}
```
- Esperado: `201` — copie `clienteId` e `cpf`.

**Erros úteis para validar:**
- CPF ou e-mail já usados no seed → `409`
- E-mail novo + CPF duplicado → `409`

### 5.2 Pendentes

- `GET {{gateway}}/api/clientes/pendentes`
- Bearer `{{token_gerente}}` → `200`

Alternativa com filtro (equivalente no gateway):

- `GET {{gateway}}/api/clientes?filtro=para_aprovar`

### 5.3 Aprovar (saga)

- `POST {{gateway}}/api/clientes/{{clienteId}}/aprovar`
- Bearer `{{token_gerente}}`
- Body: `{}`
- Esperado: `202 Accepted`

Monitore:
- RabbitMQ: `http://localhost:15672`
- MailHog: `http://localhost:8025` (credenciais provisórias)

### 5.4 Rejeitar (opcional)

- `POST {{gateway}}/api/clientes/{{clienteId}}/rejeitar`
```json
{ "motivo": "Usuário não é interessante para o banco" }
```
- Esperado: `200` — e-mail no MailHog deve conter o motivo.

---

## 6) R12 / R13 / R4 — Perfil do cliente

### 6.1 Consultar por CPF (gerente ou dono)

- `GET {{gateway}}/api/clientes/{{cpf_cliente}}`
- Bearer `{{token_gerente}}` ou `{{token_cliente}}` (próprio CPF)
- Esperado: `200` com `id`, `nome`, `salario`, `status`, etc.

### 6.2 Alterar perfil (R4)

- `PUT {{gateway}}/api/clientes/{{cpf_cliente}}`
- Bearer `{{token_cliente}}` — **só o próprio CPF** (gateway retorna `403` se tentar outro)
```json
{
  "nome": "Catharyna (editado)",
  "salario": 8000.00,
  "cidade": "Curitiba",
  "estado": "PR"
}
```
- Esperado: `200`

**Conferir efeito:** após mudar `salario`, o limite em `ms-conta` deve recalcular (metade do salário; regras &lt; 2000 e piso com saldo negativo — ver `test_13` na suíte).

### 6.3 Obter `numeroConta` e `clienteId`

1. `GET {{gateway}}/api/clientes/12912861012` com token gerente → anote `id` (UUID).
2. `GET {{gateway}}/api/contas/por-cliente/{id}` com token **cliente** dono da conta → `numero` (ex.: `1291`).

---

## 7) R3 / R5 / R6 / R7 / R8 — Conta (CLIENTE)

Use `numeroConta=1291` e token `{{token_cliente}}` salvo indicação contrária.

### 7.1 Saldo

- `GET {{gateway}}/api/contas/{{numeroConta}}/saldo`
- Esperado: `saldo`, `limite`, `saldoDisponivel` (= saldo + limite)

### 7.2 Depósito

- `POST {{gateway}}/api/contas/{{numeroConta}}/depositar`
```json
{ "valor": 51.44 }
```
- Esperado: `200`

**Erros:** valor `0` → `400`; depositar na conta **0950** com token cli1 → `403`.

### 7.3 Saque

- `POST {{gateway}}/api/contas/{{numeroConta}}/sacar`
```json
{ "valor": 10.00 }
```
- Esperado: `200` se saldo+limite permitir

**Erros:** valor negativo → `400`; valor acima do disponível → `422`; sacar conta alheia → `403`.

**cli2 (saldo negativo):** login cli2, conta `0950`, saque parcial dentro do limite.

### 7.4 Transferência

- `POST {{gateway}}/api/contas/{{numeroConta}}/transferir`
```json
{
  "numeroContaDestino": "0950",
  "valor": 25.00
}
```
- Esperado: `200`

**Erros:**
- destino `0000` → `404`
- valor acima do disponível → `422`
- origem = destino → `400`
- path com conta de outro cliente → `403`

### 7.5 Extrato

- `GET {{gateway}}/api/contas/{{numeroConta}}/extrato?dataInicio=2025-01-01&dataFim=2026-12-31`
- Confira: `tipo`, `valor`, `saldoApos`, `contraparteContaNumero`, `natureza` (entrada/saída)

### 7.6 Encerrar conta (GERENTE — R8)

Use conta de cliente **criado na saga**, não a seed `0950`:

1. Autocadastro + aprovar (seção 5)
2. `DELETE {{gateway}}/api/contas/{numero}` com Bearer gerente → `204`
3. Depósito/saque/transferência do cliente → `409` ou `422`

---

## 8) Consultas do gerente (R9, R12, R14, R19)

| Ação | Método | URL | Token |
|------|--------|-----|-------|
| Pendentes | GET | `/api/clientes/pendentes` | gerente |
| Cliente por CPF | GET | `/api/clientes/{cpf}` | gerente |
| Carteira | GET | `/api/clientes` | gerente |
| Melhores (top) | GET | `/api/clientes?filtro=melhores_clientes` | gerente |
| Top 3 contas | GET | `/api/contas/top3` | gerente |
| Listar contas | GET | `/api/contas` | gerente |
| PATCH limite | PATCH | `/api/contas/{numero}/limite` | gerente |

Body do limite:
```json
{ "limite": 999.99 }
```

---

## 9) Admin (R15, R16, R17, R18, R20)

| Ação | Método | URL |
|------|--------|-----|
| Listar gerentes | GET | `/api/gerentes` |
| Dashboard | GET | `/api/gerentes/stats` |
| Relatório clientes | GET | `/api/clientes/report` |
| Relatório (filtro) | GET | `/api/clientes?filtro=adm_relatorio_clientes` |
| Agregados por gerente | GET | `/api/contas/agregados/por-gerente` |
| Criar gerente | POST | `/api/gerentes` |
| Alterar gerente | PUT | `/api/gerentes/{cpf}` |
| Remover gerente | DELETE | `/api/gerentes/{cpf}` |

**Criar gerente (exemplo)**
```json
{
  "cpf": "40501740066",
  "nome": "Gerente HTTPie",
  "email": "gerente.httpie@example.com",
  "telefone": "41990000000",
  "senha": "tads",
  "tipo": "GERENTE"
}
```

**Remover gerente:** não remova o **último** gerente ativo → `422`.

> **R20 senha:** o PUT aceita `senha`, mas a persistência no `ms-auth` via saga ainda pode estar incompleta — após alterar, teste login com `tads` e documente o resultado.

---

## 10) ACL no gateway (perfis)

Comportamento igual à suíte `test_11` / `test_14`:

| Cenário | Esperado |
|---------|----------|
| Sem Bearer em rota protegida | `401` |
| Cliente em `/api/clientes/pendentes` | `403` |
| Cliente em `/api/clientes/report` | `403` |
| Cliente POST `/api/gerentes` | `403` |
| Gerente em `/api/gerentes/stats` | `403` |
| Admin POST depositar em conta | `403` |
| Cliente deposita/sacar/transfere conta alheia | `403` |
| Cliente PUT perfil de outro CPF | `403` |
| Gerente consulta gerente por CPF (rota admin) | `403` |

Testar no **gateway**; no Swagger direto (808x) o Spring pode aceitar sem o mesmo ACL.

---

## 11) Dicas finais

- Rode `GET /api/integration/reboot` quando saldos, contas ou logins estiverem inconsistentes.
- Sagas: aguarde MailHog antes de validar conta/saldo do novo cliente.
- Campos JSON: no gateway use os nomes do OpenAPI exposto (`numeroContaDestino`, não `destino`).
- Evidências: salve request/response + print MailHog/RabbitMQ para a defesa.

---

## 12) Próximos passos

| Objetivo | Documento |
|----------|-----------|
| Automatizar tudo | [`integrationTests.md`](integrationTests.md) |
| Detalhe de cada teste pytest | [`guia-completo-testes-integracao.md`](guia-completo-testes-integracao.md) |
| Explorar DTOs por MS | [`swaggerTests.md`](swaggerTests.md) |
| Correções recentes (reboot, ACL) | `testReports/corrections/5.18[04-30]*`, `5.18[05-15]*` |
