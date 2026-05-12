# Tutor — Fluxos transacionais do BANTADS (Swagger / OpenAPI)

Este arquivo serve como mapa organizado para você testar **todas as transações** (endpoints que fazem algo “de negócio” no backend) do app via **Swagger/OpenAPI**, seguindo a referência do seu material acadêmico (`all bantads intructions.md`).

Ele é intencionalmente estruturado para a próxima etapa: “como testar cada fluxo” (cada seção já deixa prontos: endpoint(s), corpo (quando existe), status esperado e o que conferir como efeito colateral).

Além disso, abaixo há **como iniciar o Swagger UI**, um **guia rápido dos botões da interface** e, em cada fluxo, a subseção **Na interface Swagger UI** com passos na tela.

---

## Como iniciar o OpenAPI / Swagger UI

### Pré-requisito
- **Docker Desktop** ligado (para `docker compose`).

### 1) Levantar o ambiente
Na raiz do repositório (onde está `docker-compose.yml`):

```powershell
docker compose up --build -d
```

Aguarde os serviços estabilizarem (na primeira execução pode levar vários minutos). Confira com `docker compose ps` se os containers dos microsserviços que você vai testar estão **running**.

### 2) Abrir o Swagger UI no navegador
O **OpenAPI** é exposto pelo **SpringDoc** dentro de cada microsserviço Spring Boot: você usa o **Swagger UI** (HTML) no navegador. Cada serviço tem **sua própria** UI — abra **uma aba por microsserviço** que for usar:

| Microsserviço | URL do Swagger UI |
|---------------|-------------------|
| **ms-auth** | `http://localhost:8081/auth/swagger-ui.html` |
| **ms-cliente** | `http://localhost:8082/clientes/swagger-ui.html` |
| **ms-conta** | `http://localhost:8083/contas/swagger-ui.html` |
| **ms-gerente** | `http://localhost:8084/gerentes/swagger-ui.html` |

Se a página não abrir, o processo pode estar parado ou a porta ocupada.

### 3) Página com links para todos os Swaggers (opcional)
- **`http://localhost/docs`** — página do gateway com links para os Swagger UIs acima.

### 4) Guia rápido dos controles na interface
1. **Tags** — agrupam endpoints por controlador; expanda a tag certa (ex.: auth, cliente).
2. **Endpoint** — clique na linha do método (`GET`, `POST`, …).
3. **Try it out** — habilita edição de parâmetros e corpo.
4. **Parameters** — preencha path/query se aparecerem (ex.: `{numero}`, `{cpf}`).
5. **Request body** — cole o JSON de exemplo deste documento (modo **application/json**).
6. **Authorize** (cadeado no topo da página) — para JWT: esquema **bearerAuth** (ou nome equivalente no seu OpenAPI); cole normalmente **só o token** (sem `Bearer `), pois o Swagger costuma prefixar sozinho. **Authorize** → feche o modal.
7. **Execute** — envia a requisição.
8. **Responses** — confira **Code** (HTTP), **Response body** e **Response headers**.

### 5) JSON OpenAPI cru (sem interface gráfica)
Útil para importar em Postman/Insomnia:

- `http://localhost:8081/auth/v3/api-docs`
- `http://localhost:8082/clientes/v3/api-docs`
- `http://localhost:8083/contas/v3/api-docs`
- `http://localhost:8084/gerentes/v3/api-docs`

### 6) Swagger no microsserviço (porta 808x) vs chamadas pelo Gateway (`/api/...`)
- **Swagger UI em `localhost:808x`** dispara requisições **direto** ao microsserviço (ex.: `http://localhost:8082/clientes/...`). É o melhor lugar para explorar o contrato e ver schemas.
- O **Angular** e o cenário “igual ao trabalho” usam **`http://localhost/api/...`**, onde o **gateway** valida JWT e **perfis** (CLIENTE / GERENTE / ADMINISTRADOR). Para reproduzir **exatamente** bloqueios `401`/`403` do gateway, use também **HTTPie Desktop**, **Postman** ou **curl** contra `http://localhost/api/...` (veja `tutor/httpieTests.md`).

---

## 0) Convenções e URLs base

### Papéis e perfis
- `CLIENTE` (token JWT)
- `GERENTE` (token JWT)
- `ADMINISTRADOR` (token JWT)

### Base URLs (ambiente local)
- `Gateway`: `http://localhost/api`
- `ms-auth`: `http://localhost:8081/auth`
- `ms-cliente`: `http://localhost:8082/clientes`
- `ms-conta`: `http://localhost:8083/contas`
- `ms-gerente`: `http://localhost:8084/gerentes`

### Header de autenticação
Em rotas que exigem token via API Gateway:
`Authorization: Bearer <JWT>`

### Observação importante sobre Swagger “direto no microsserviço”
Neste repositório, cada microsserviço libera requisições por padrão (`permitAll` no Spring Security). Assim:
- endpoints que **precisam** do `Authorization` no controller (ex.: alguns relatórios) exigem o header mesmo no Swagger direto;
- endpoints que **dependem do ACL do Gateway** podem até “funcionar” sem Bearer quando testados direto no microsserviço, mas isso **não é o mesmo** que o comportamento do app.

Se você quer testes “idênticos ao front”, prefira chamar via `Gateway`. Se você quer apenas validar “contrato e efeitos no banco”, Swagger direto é suficiente.

---

## 1) Setup repetível (antes de começar os fluxos)

### Na interface Swagger UI (seed + token para copiar)

1. Abra **`http://localhost:8081/auth/swagger-ui.html`** (ms-auth).
2. Expanda a operação **`GET /reboot`** (ou nome equivalente no tag de inicialização).
3. **Try it out** → **Execute**. Espere **`200`** — isso recria os usuários seed no Mongo (senha típica de desenvolvimento: `tads`).
4. Expanda **`POST /login`** → **Try it out**.
5. No **Request body**, cole:
   ```json
   { "login": "ger1@bantads.com.br", "senha": "tads" }
   ```
   (troque o e-mail pelo perfil que precisar: cliente, gerente ou admin — ver seed no projeto.)
6. **Execute**. Na resposta, copie o valor de **`access_token`** para um bloco de notas (você vai colar no **Authorize** dos outros Swaggers quando precisar).

### Linha de comando (alternativa ao Swagger)

1. Suba toda a stack (raiz do repo, onde existe `docker-compose.yml`):
   ```powershell
   docker compose up --build -d
   ```
2. Seed: `GET http://localhost:8081/auth/reboot` ou `GET http://localhost/api/auth/reboot`
3. Login via gateway ou ms-auth e copie `access_token` como acima.

### Depois do login no Swagger

Nos microsserviços **`ms-cliente`**, **`ms-conta`** e **`ms-gerente`**: clique em **Authorize**, cole o JWT (normalmente sem prefixo `Bearer `), **Authorize** → feche. Use **Execute** em cada endpoint protegido.

---

## 2) Fluxos transacionais — visão geral

Abaixo estão os fluxos mapeados por requisito (`R1` a `R20`) e pelos endpoints atuais no código. **Cada seção numerada (3 em diante)** inclui o bloco **Na interface Swagger UI** com passos na tela (**Try it out**, parâmetros, **Authorize**, **Execute**) além dos endpoints e JSON de referência.

Quando existir efeito assíncrono, eu marco como:
- **Síncrono**: resposta HTTP e alteração no banco esperadas no mesmo request (ou imediatamente)
- **Assíncrono (SAGA)**: alteração em etapas com orquestração via RabbitMQ e `ms-saga-orchestrator`

---

## 3) R2 — Login (ms-auth) [Síncrono]

### Na interface Swagger UI
1. Abra **`http://localhost:8081/auth/swagger-ui.html`**.
2. Localize **`POST /login`** (ou caminho equivalente no OpenAPI).
3. **Try it out**.
4. No **Request body**, use o JSON abaixo (ajuste `login` ao e-mail do usuário seed).
5. **Execute** → confira **`200`** e copie **`access_token`** para usar em **Authorize** nos outros Swaggers ou para requisições externas ao gateway.

**Endpoint**
- `POST http://localhost:8081/auth/login`
- (Gateway: `POST http://localhost/api/auth/login`)

**Body**
```json
{ "login": "cli1@bantads.com.br", "senha": "tads" }
```

**Esperado**
- `200 OK`
- resposta contém:
  - `access_token`
  - `token_type` (Bearer)
  - `tipo` (`CLIENTE` | `GERENTE` | `ADMINISTRADOR`)
  - `usuario` (cpf, nome, email, tipo)

**O que conferir depois**
- usar o token nos próximos endpoints do app (via Gateway) para bater com os perfis.

---

## 4) R2 — Logout e introspect (ms-auth) [Síncrono]

### Na interface Swagger UI
1. No Swagger do **ms-auth**, clique **Authorize** e informe o mesmo JWT obtido no login (**logout** e **introspect** exigem token válido).
2. **Logout**: expanda **`POST /logout`** → **Try it out** → **Execute** (o header `Authorization` costuma ser preenchido automaticamente após Authorize).
3. **Introspect**: expanda **`GET /introspect`** → **Try it out** → **Execute**.

### 4.1 Logout
**Endpoint**
- `POST http://localhost:8081/auth/logout`

**Header**
- `Authorization: Bearer <JWT>`

**Esperado**
- `200 OK`
- retorna `cpf`, `nome`, `email`, `tipo`

### 4.2 Introspect (opcional)
**Endpoint**
- `GET http://localhost:8081/auth/introspect`

**Header**
- `Authorization: Bearer <JWT>`

**Esperado**
- `200 OK`
- retorna `active`, `subject` (login/email), `perfil`, `expiraEm`

---

## 5) R1 — Autocadastro (Fase 1 e Fase 2) [Assíncrono (SAGA) na Fase 2]

Este é o único fluxo orquestrado no `ms-saga-orchestrator` (aprovação do cliente), conforme código atual.

### Na interface Swagger UI (visão geral)
- **Fase 1 (cadastro público):** só **`ms-cliente`** — **`POST`** na raiz de `/clientes` **sem** JWT.
- **Fase 2 (gerente):** **`ms-cliente`** — **`GET /pendentes`**, **`POST /{id}/aprovar`** ou **`POST /{id}/rejeitar`** — com JWT de gerente em **Authorize** (na prática você faz login no ms-auth como gerente, copia o token e cola no Swagger do ms-cliente).

### 5.1 Fase 1 — Autocadastro público [Síncrono HTTP + evento assíncrono publicado]

#### Na interface Swagger UI
1. Abra **`http://localhost:8082/clientes/swagger-ui.html`**.
2. Encontre **`POST`** que cria cliente (geralmente tag **cliente** / **POST** sem path extra — autocadastro na raiz).
3. **Try it out** — **não** use **Authorize** (rota pública no gateway; no MS direto também funciona sem token neste projeto).
4. Cole o **Request body** abaixo (troque `email` para um e-mail ainda não usado).
5. **Execute** → espere **`201`** e anote **`clienteId`** (UUID) para a Fase 2.

**Endpoint**
- `POST http://localhost:8082/clientes` (ms-cliente)
- (Gateway: `POST http://localhost/api/clientes`)

**Body (JSON)**
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

**Esperado**
- `201 Created`
- retorna `clienteId` (UUID), `cpf` e mensagens do processo

**O que conferir**
- no banco do `ms-cliente`: registro em estado `PENDENTE_APROVACAO`
- evento publicado na saga (RabbitMQ) para iniciar a aprovação futura

### 5.2 Fase 2 — Pendentes e Aprovar (Gerente) [Assíncrono (SAGA)]

#### Na interface Swagger UI
1. Faça **login no ms-auth** como gerente seed (ex.: `ger1@bantads.com.br` / `tads`), copie **`access_token`**.
2. Abra **`http://localhost:8082/clientes/swagger-ui.html`** → **Authorize** → cole o token → **Authorize**.
3. **Listar pendentes:** expanda **`GET /pendentes`** → **Try it out** → **Execute**. Copie um **`id`** (UUID) da lista.
4. **Aprovar:** expanda **`POST /{id}/aprovar`** (ou `{clienteId}` conforme o OpenAPI) → **Try it out** → preencha **`id`** com o UUID copiado → body `{}` se solicitado → **Execute**.
5. Aguarde **`202`** e monitore RabbitMQ/MailHog conforme o checklist abaixo.

#### (a) Listar pendentes
**Endpoint**
- `GET http://localhost:8082/clientes/pendentes`

**Esperado**
- `200 OK`
- lista itens com `id` (UUID), `cpf`, `nome`, `email`, `telefone`, `salario`, `cidade`, `estado`, `criadoEm`

#### (b) Aprovar
**Endpoint**
- `POST http://localhost:8082/clientes/{id}/aprovar`
- (Gateway: `POST http://localhost/api/clientes/{id}/aprovar`)

**Body**
- normalmente `{}`

**Esperado**
- `202 Accepted`
- transição de estado no `ms-cliente` para `PROCESSANDO_APROVACAO`
- a saga orquestra comandos:
  - `cmd.gerente`: `GERENTE_LIST_ATIVOS`
  - `cmd.conta`: `CONTA_COUNTS_BY_GERENTE`
  - `cmd.conta`: `CONTA_CREATE`
  - `cmd.auth`: `AUTH_CREATE_CLIENTE`
  - `cmd.email`: `EMAIL_SEND_CREDENTIALS`
  - `cmd.cliente`: `CLIENTE_MARCAR_APROVADO`

**O que conferir (checklist rápido)**
1. RabbitMQ: ver consumo/produção nas filas `cmd.*` e responses.
2. MailHog: e-mail com credenciais temporárias enviado pelo passo `ms-email`.
3. Banco final:
   - `ms-cliente`: cliente vira `APROVADO`
   - `ms-conta`: conta é criada e passa a aparecer nas consultas
   - `ms-auth`: usuário CLIENTE existe e passa a autenticar

> Para testar o login após a saga: copie o `email` (do autocadastro) e a senha aleatória que o e-mail trouxe.

### 5.3 Rejeitar pendente (Gerente) [Síncrono no ms-cliente + evento assíncrono]

#### Na interface Swagger UI
Mesmo fluxo **Authorize** do gerente no Swagger **`ms-cliente`**. Expanda **`POST /{id}/rejeitar`** → **Try it out** → informe **`id`** → cole o JSON do **Body** abaixo → **Execute**.

**Endpoint**
- `POST http://localhost:8082/clientes/{id}/rejeitar`

**Body**
```json
{ "motivo": "Usuário não é interessante para o banco" }
```

**Esperado**
- `200 OK`
- estado vira `REJEITADO`
- saga dispara fluxo de e-mail de reprovação (via `ms-saga-orchestrator` e `ms-email`)

---

## 6) R5 — Depósito (ms-conta) [Síncrono]

### Na interface Swagger UI
1. Abra **`http://localhost:8083/contas/swagger-ui.html`**.
2. Se o endpoint exigir JWT no controller, **Authorize** com token de **CLIENTE** (login no ms-auth com usuário cliente que tenha conta).
3. Expanda **`POST .../depositar`** → **Try it out**.
4. Em **`numero`** (path), informe o número da conta (ex.: obtido em §11 ou após aprovação da saga).
5. Cole o **Request body** JSON → **Execute** → confira **`200`** e os campos da resposta.

**Endpoint**
- `POST http://localhost:8083/contas/{numero}/depositar`
- (Gateway: `POST http://localhost/api/contas/{numero}/depositar`)

**Body**
```json
{ "valor": 51.44 }
```

**Esperado**
- `200 OK` com:
  - `movimentacaoId`, `tipo`, `valor`, `saldoOrigem` (null), `saldoDestino`, `dataHora`

**O que conferir**
- `GET /contas/{numero}/saldo` deve refletir o novo saldo
- `GET /contas/{numero}/extrato?dataInicio=YYYY-MM-DD&dataFim=YYYY-MM-DD` deve conter o lançamento

---

## 7) R6 — Saque (ms-conta) [Síncrono]

### Na interface Swagger UI
No Swagger **`ms-conta`**, localize **`POST .../sacar`** → **Try it out** → **`numero`** no path → body com **`valor`** → **Execute**. Use token **CLIENTE** em **Authorize** se o OpenAPI indicar segurança no método.

**Endpoint**
- `POST http://localhost:8083/contas/{numero}/sacar`

**Body**
```json
{ "valor": 51.44 }
```

**Esperado**
- `200 OK` (se saldo+limite comportar)
- Em falha:
  - `409` (conta inativa) -> `ContaInativaException`
  - `404` (conta não existe)
  - `422 Unprocessable Entity` (Saldo insuficiente)
  - `400` (operação inválida)

**O que conferir**
- `GET /contas/{numero}/saldo` e `GET /contas/{numero}/extrato` após o saque.

---

## 8) R7 — Transferência (ms-conta) [Síncrono + efeito em extrato]

### Na interface Swagger UI
**`POST .../transferir`** → **Try it out** → path **`numero`** da conta de origem → body com **`numeroContaDestino`** e **`valor`** → **Execute**.

**Endpoint**
- `POST http://localhost:8083/contas/{numero}/transferir`

**Body**
```json
{ "numeroContaDestino": "0123", "valor": 51.44 }
```

**Esperado**
- `200 OK`
- se tentar transferir para a própria conta:
  - `400 Bad Request` (regra em código: origem != destino)

**O que conferir**
- saldo da conta de origem caiu e conta destino subiu (via `GET /contas/{numero}/saldo`)
- extrato de ambas contém o tipo `TRANSFERENCIA` e contraparte (`contraparteContaNumero`)

---

## 9) R8 — Consulta de extrato (ms-conta) [Síncrono]

### Na interface Swagger UI
**`GET .../extrato`** → **Try it out** → preencha **`numero`** → opcionalmente **`dataInicio`** e **`dataFim`** (query) → **Execute**.

**Endpoint**
- `GET http://localhost:8083/contas/{numero}/extrato`

**Query params opcionais**
- `dataInicio` (formato `YYYY-MM-DD`)
- `dataFim` (formato `YYYY-MM-DD`)

Se não enviar, o serviço usa:
- últimos 30 dias até “agora”.

**Esperado**
- `200 OK`
- retorna lista de `LancamentoExtratoResponse` com:
  - `tipo`, `valor`, `saldoApos`, `contraparteContaNumero` (quando aplicável)

---

## 10) R3 — Consulta de saldo (ms-conta) [Síncrono]

### Na interface Swagger UI
**`GET .../saldo`** → **Try it out** → **`numero`** → **Execute**.

**Endpoint**
- `GET http://localhost:8083/contas/{numero}/saldo`

**Esperado**
- `200 OK` com:
  - `saldo`, `limite`, `saldoDisponivel`

---

## 11) Consultas auxiliares de conta (ms-conta) [Síncrono]

### Na interface Swagger UI
No **`http://localhost:8083/contas/swagger-ui.html`**, use **Try it out** em cada **`GET`**: path **`{numero}`** ou **`{clienteId}`** conforme a operação; em **`GET /contas`** preencha opcionalmente **`gerenteId`** na query.

### 11.1 Por número
- `GET http://localhost:8083/contas/{numero}`

### 11.2 Por cliente (clienteId)
- `GET http://localhost:8083/contas/por-cliente/{clienteId}`

**Como obter `clienteId` para testes**
- `GET http://localhost:8082/clientes/{cpf}` retorna `id` (UUID do cliente no ms-cliente).
- com esse `id`, chamar `.../contas/por-cliente/{id}` para obter `numero` da conta.

### 11.3 Listagem (gerente/admin)
- `GET http://localhost:8083/contas`
- opcional: `?gerenteId=<UUID>`

**Esperado**
- `200 OK` lista contas ativas.

---

## 12) R14 — “Top 3”/Melhores clientes (ms-conta) [Síncrono]

### Na interface Swagger UI
**`GET /top3`** (ou caminho equivalente no tag de relatório) → **Try it out** → **Execute**.

**Endpoint**
- `GET http://localhost:8083/contas/top3`

**Esperado**
- `200 OK` com lista ordenada pelos maiores saldos (conforme regra do serviço)

---

## 13) R8 — Atualização de limite e encerramento de conta (ms-conta)

Estes endpoints existem no código e refletem o requisito de “limite/ativação” feito pelo gerente (R8 no material).

### Na interface Swagger UI
Use token **GERENTE** em **Authorize** no Swagger **`ms-conta`** se o método estiver protegido. **`PATCH .../limite`**: **Try it out** → **`numero`** → body **`limite`**. **`DELETE`** da conta: **Try it out** → **`numero`** → **Execute** → espere **`204`**.

### 13.1 Atualizar limite
**Endpoint**
- `PATCH http://localhost:8083/contas/{numero}/limite`

**Body**
```json
{ "limite": 123.45 }
```

**Esperado**
- `204 No Content`
- validar depois com `GET /contas/{numero}/saldo`

### 13.2 Encerrar conta (soft delete / inativação)
**Endpoint**
- `DELETE http://localhost:8083/contas/{numero}`

**Esperado**
- `204 No Content`
- validar depois: `GET /contas/{numero}/saldo` deve falhar com `409` (conta inativa)

---

## 14) R9 — Pendentes de autocadastro (ms-cliente) [Síncrono (no ms-cliente)]

### Na interface Swagger UI
**`http://localhost:8082/clientes/swagger-ui.html`** → **Authorize** (gerente) → **`GET /pendentes`** → **Try it out** → **Execute**.

**Endpoint**
- `GET http://localhost:8082/clientes/pendentes`

**Esperado**
- `200 OK` lista em `PENDENTE_APROVACAO`

---

## 15) R10 — Aprovar cliente (ms-cliente + ms-saga) [Assíncrono (SAGA) / fluxo feliz]

### Na interface Swagger UI
**Authorize** (gerente) → **`POST /{id}/aprovar`** → **Try it out** → UUID em **`id`** → body `{}` se aplicável → **Execute** → **`202`**.

**Endpoint**
- `POST http://localhost:8082/clientes/{id}/aprovar`

**Body**
- opcional (na prática: `{}`)

**Esperado**
- `202 Accepted`
- saga cria conta e usuário, envia e-mail e marca `APROVADO` em `ms-cliente`

---

## 16) R12/R13 — Consultas e visão do cliente (ms-cliente) [Síncrono]

### Na interface Swagger UI
1. **`GET /clientes/{cpf}`** — **Try it out** → CPF **11 dígitos** sem máscara no path → **Execute**.
2. **`GET /clientes`** — token **GERENTE** em **Authorize** → opcional **`filtro`** na query → **Execute**.

### 16.1 Consultar por CPF (detalhe)
- `GET http://localhost:8082/clientes/{cpf}` (CPF com 11 dígitos)

**Esperado**
- `200 OK` com `id`, `cpf`, `nome`, `email`, `telefone`, `salario`, `cidade`, `estado`, `endereco`, `cep`, `status`
- `404` quando não existir (regra em código via `ResponseStatusException`)

### 16.2 Listar carteira com filtro (para GERENTE)
- `GET http://localhost:8082/clientes` (opcional: `?filtro=...`)

**Valores de `filtro` suportados no código**
- `para_aprovar` (consulta pendentes)
- `melhores_clientes`
- `adm_relatorio_clientes`
- omitir `filtro` => “carteira” (clientes aprovados com conta)

**Esperado**
- `200 OK`
- a resposta é “carteira” com campos como `conta`, `saldo`, `limite`, `situacao`, `gerenteCpf`, `gerenteNome` etc (conforme DTO).

> Observação: este endpoint usa o `Authorization` como header para chamar upstreams (ms-conta e ms-gerente).
> Então, para testes que validam “efeito completo”, inclua o Bearer JWT.

---

## 17) R4 — Alteração de perfil do cliente (ms-cliente) [Síncrono, sem SAGA no ms-saga]

### Na interface Swagger UI
**`PUT /clientes/{cpf}`** → **Try it out** → CPF no path → edite o JSON do body (campos opcionais) → **Execute**.

No material acadêmico, a especificação indica que mudança de salário recalcula limite e ajusta conforme saldo negativo. No código atual:
- `ms-cliente` altera apenas dados cadastrais do cliente em sua base e retorna o `GET` por CPF.
- não há chamada/órquestração para recalcular limite em `ms-conta` via saga (gap a validar).

**Endpoint**
- `PUT http://localhost:8082/clientes/{cpf}`

**Body (campos opcionais)**
```json
{
  "nome": "Novo Nome",
  "email": "novoemail@exemplo.com",
  "telefone": "41998887766",
  "salario": 2500.00,
  "endereco": "Rua X",
  "cidade": "Curitiba",
  "estado": "PR",
  "cep": "80000000"
}
```

**Esperado**
- `200 OK` com dados atualizados (retorno do “detalhe” por CPF)

**O que conferir (para sua próxima etapa de testes)**
1. `ms-cliente`: campos mudaram corretamente.
2. `ms-conta`: `GET /contas/{numero}/saldo` (especialmente `limite`) mudou ou não após alteração de salário.
   - se não mudar: documentar como diferença entre `all bantads intructions.md` e implementação atual.

---

## 18) R17/R18/R19/R20 — CRUD de gerentes (ms-gerente) [Síncrono, sem SAGA no ms-saga]

### Na interface Swagger UI
Abra **`http://localhost:8084/gerentes/swagger-ui.html`**. Para operações administrativas, use **Authorize** com JWT **ADMINISTRADOR** se o OpenAPI exigir. **`POST /gerentes`**: **Try it out** → body JSON → **`201`**. **`PUT /gerentes/{cpf}`** e **`DELETE /gerentes/{cpf}`**: preencha o CPF no path → **Execute**.

Os endpoints de gerentes estão implementados em `ms-gerente` (criar, alterar, remover). Porém:
- o código comenta que senha e remanejamento de contas seriam tratados via saga quando implementadas.
- na implementação atual do `ms-saga-orchestrator`, a saga efetiva é a de aprovação do autocadastro.

### 18.1 Inserir gerente (criar)
**Endpoint**
- `POST http://localhost:8084/gerentes`

**Body**
```json
{
  "cpf": "40501740066",
  "nome": "Gerente Exemplo",
  "email": "gerente3@bantads.com.br",
  "telefone": "41990000000",
  "senha": "tads",
  "tipo": "GERENTE"
}
```

**Esperado**
- `201 Created` com `GerenteResponse`

**O que conferir**
- se o gerente criado consegue fazer login em `ms-auth` (porque, no código atual, inserir gerente não cria usuário no Mongo via saga).

### 18.2 Alterar gerente
**Endpoint**
- `PUT http://localhost:8084/gerentes/{cpf}`

**Body**
```json
{ "nome": "Novo Nome", "email": "novo@exemplo.com", "senha": "novaSenha" }
```

**Esperado**
- `200 OK` com `GerenteResponse`

**Gap a testar**
- alterar `senha` muda efetivamente a senha no `ms-auth`? No serviço, a alteração atual trata apenas nome/e-mail.

### 18.3 Remover gerente (soft delete)
**Endpoint**
- `DELETE http://localhost:8084/gerentes/{cpf}`

**Esperado**
- `200 OK` com `GerenteResponse`
- não permite remover o último gerente ativo (regra de negócio)

---

## 19) R19 — Listagem de gerentes (ms-gerente) [Síncrono]

### Na interface Swagger UI
**`GET /gerentes`** → **Try it out** → **Execute** (Authorize conforme segurança do método).

**Endpoint**
- `GET http://localhost:8084/gerentes`

**Esperado**
- `200 OK` com lista ordenada por `nome` ascendente (apenas gerentes ativos)

**O que conferir**
- campos retornados: `id`, `cpf`, `nome`, `email`, `telefone`, `tipo`, `ativo`

---

## 20) R15 — Dashboard admin (ms-gerente) [Síncrono, com composição via ms-conta]

### Na interface Swagger UI
**`GET /gerentes/stats`** → **Try it out** → **Execute** (normalmente perfil admin — **Authorize** se necessário).

**Endpoint**
- `GET http://localhost:8084/gerentes/stats`

**Esperado**
- `200 OK` lista de `DashboardGerenteItem`:
  - `gerenteId`, `cpf`, `nome`, `email`, `totalClientes`,
  - `somaSaldosPositivos`, `somaSaldosNegativos`

**O que conferir**
- ordem desc por `somaSaldosPositivos` (com desempate por `nome`)

---

## 21) R16 — Relatório de clientes (ms-cliente, admin) [Síncrono]

### Na interface Swagger UI
1. Login no **ms-auth** com usuário **ADMINISTRADOR** seed → copie **`access_token`**.
2. **`http://localhost:8082/clientes/swagger-ui.html`** → **Authorize** → cole o token.
3. **`GET /report`** (ou **`/clientes/report`** conforme tags) → **Try it out** → **Execute** → **`200`** com lista.

**Endpoint**
- `GET http://localhost:8082/clientes/report`
- (Gateway: `GET http://localhost/api/clientes/report`)

**Header**
- `Authorization: Bearer <JWT ADMINISTRADOR>` (o controller exige header para chamar upstream)

**Esperado**
- `200 OK` com lista de `AdminRelatorioClienteResponse`
- ordenação crescente por `nomeCliente` (conforme código)

---

## 22) “Ações de apoio” para sua próxima etapa (testes por fluxo)

Use os passos de **Como iniciar o OpenAPI / Swagger UI** e, em cada fluxo, **Na interface Swagger UI** para repetir as mesmas requisições de forma guiada na interface.

Para cada fluxo do bloco acima, recomendo registrar sempre:
1. `request`: endpoint + body + header (Bearer quando aplicável)
2. `response`: status + campos principais
3. `efeito no estado`: saldo/limite/extrato e/ou status do cliente
4. `efeito assíncrono`: filas/consumo do RabbitMQ e e-mail no MailHog (quando for saga de aprovação)

Assim você consegue montar a evidência de teste exigida na fase de avaliação.

