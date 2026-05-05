# Guia passo a passo — testar Swagger / OpenAPI no BANTADS (ponta a ponta)

Este documento descreve como subir o sistema, abrir o Swagger de cada microsserviço e validar os fluxos mais importantes (**login** e **autocadastro → aprovação via saga**). Texto em **Português (Brasil)**.

---

## O que você está testando


| Peça           | Função                                                                                                    |
| -------------- | --------------------------------------------------------------------------------------------------------- |
| **Swagger UI** | Página no navegador para listar endpoints e usar **Try it out**.                                          |
| **OpenAPI**    | Especificação JSON em `/v3/api-docs` (gerada pelo **SpringDoc** dentro do mesmo processo do Spring Boot). |
| **Gateway**    | Encaminha `/api/...` para os microsserviços e aplica JWT nas rotas protegidas.                            |


**Importante:** o Swagger roda **dentro** de cada microsserviço (não é um processo separado). Se o `ms-cliente` estiver parado, não haverá Swagger daquele serviço.

---

## Pré-requisitos

1. **Docker Desktop** ligado (para `docker compose`).
2. Navegador atualizado (Chrome/Edge/Firefox).
3. Opcional: **Postman** ou **Insomnia** (importar `http://.../v3/api-docs`).

---

## 1. Subir toda a stack

No diretório raiz do repositório (onde está `docker-compose.yml`):

```powershell
docker compose up --build -d
```

Aguarde os healthchecks dos bancos, RabbitMQ, Mongo etc. até os serviços estabilizarem (pode levar alguns minutos na primeira vez).

### Portas úteis (padrão do `docker-compose.yml`)

Na própria máquina (**host**) o Compose expõe portas assim. Todas são acessadas em **`http://localhost:<porta>`** no navegador ou no HTTPie; **só o número da porta não basta**, porque falta saber protocolo (`http`), host (`localhost`) e porta.

| Serviço | URL no host (`http://`) | Porta também | Observação |
| ------- | ------------------------ | ------------- | ----------- |
| **Gateway** | `http://localhost` e `http://127.0.0.1` | **80** (implícito) | Compose mapeia `80:3000` (dentro do container o gateway usa 3000). |
| **ms-auth** | `http://localhost:8081` | **8081** | Context `/auth`; Swagger UI: `…/auth/swagger-ui.html`. |
| **ms-cliente** | `http://localhost:8082` | **8082** | Context `/clientes`; Swagger UI: `…/clientes/swagger-ui.html`. |
| **ms-conta** | `http://localhost:8083` | **8083** | Context `/contas`; Swagger UI: `…/contas/swagger-ui.html`. |
| **ms-gerente** | `http://localhost:8084` | **8084** | Context `/gerentes`; Swagger UI: `…/gerentes/swagger-ui.html`. |
| **ms-saga** | `http://localhost:8085` | **8085** | Orquestrador da saga (actuator/HTTP conforme projeto). |
| **RabbitMQ Management** | `http://localhost:15672` | **15672** | UI Web de gestão. Credenciais conforme `.env` (geralmente `guest`/`guest`). **AMQP do broker usa outra porta** (normalmente **5672**). |
| **MailHog** | `http://localhost:8025` | **8025** | UI Web para ver e-mails capturados (**SMTP** ao serviço costuma ser **1025**, não confundir). |
| **MongoDB (auth)** | `mongodb://localhost:27017` (host) | **27017** | Serviço Compose `mongo-auth`; base usada pelo `ms-auth`: **`auth_db`**. Dentro da rede Docker o host é **`mongo-auth`**, não `localhost`. |
| **PostgreSQL cliente** | (acesso típico via `docker compose exec`) | **5433** → 5432 no container | Serviço **`db-cliente`**; base **`cliente_db`**. |
| **PostgreSQL conta** | idem | **5434** → 5432 | Serviço **`db-conta`**; base **`conta_db`**. |
| **PostgreSQL gerente** | idem | **5435** → 5432 | Serviço **`db-gerente`**; base **`gerente_db`**. |
| **ms-email** | `http://localhost:8086` | **8086** | E-mail assíncrono (RabbitMQ + SMTP para MailHog). |
| **frontend (Angular)** | `http://localhost:4200` | **4200** | UI; em produção acadêmica o browser costuma falar com o **gateway** (`http://localhost`). |


Para checar se o gateway respondeu:

- `GET http://localhost/health` → deve retornar algo como `{ "status": "up", "service": "bantads-gateway" }`.

---

### Infraestrutura: nomes Docker, rede e JDBC (este repositório)

Tudo abaixo reflete **`docker-compose.yml` na raiz**. Use estes nomes nos comandos **`docker compose exec <serviço>`** para não falhar por serviço inexistente.

| Chave no Compose | `container_name` (se definido) | Observação |
| ---------------- | ------------------------------ | ---------- |
| `rabbitmq` | `rabbitmq` | Broker: host interno **`rabbitmq`**, AMQP **5672**. |
| `mongo-auth` | `mongo-auth` | URI do `ms-auth`: **`SPRING_MONGODB_URI=mongodb://mongo-auth:27017/auth_db`**. |
| `db-cliente` | *(gerado pelo Compose)* | JDBC no `ms-cliente`: `jdbc:postgresql://db-cliente:5432/cliente_db`. |
| `db-conta` | *(gerado pelo Compose)* | JDBC no `ms-conta`: `jdbc:postgresql://db-conta:5432/conta_db`. |
| `db-gerente` | *(gerado pelo Compose)* | JDBC no `ms-gerente`: `jdbc:postgresql://db-gerente:5432/gerente_db`. |
| `ms-auth` … `ms-email`, `gateway`, `frontend` | *(gerado pelo Compose)* | DNS interno = **nome do serviço** (ex.: `http://ms-auth:8081` no `gateway`). |

**Rede Docker:** todas as máquinas no mesmo bridge **`bantads-net`**.

**Credenciais Postgres (valores padrão do Compose):** `POSTGRES_USER` → **`user`**, `POSTGRES_PASSWORD` → **`password`** (podem ser sobrescritos por `.env`). O **usuário do RabbitMQ** padrão costuma ser `guest` / `guest` se não configurar `.env`.

**Tabelas JPA típicas (para conferir dados):**

- `cliente_db` · tabela **`cliente`** (`ms-cliente`).
- `conta_db` · **`conta`**, **`movimentacao`** (`ms-conta`).
- `gerente_db` · **`gerente`** (`ms-gerente`).

#### Conferência rápida após `/reboot` (só Mongo do `ms-auth`)

O **`GET /reboot` não altera Postgres** — só recria utilizadores DAC no Mongo (**coleção `usuarios`**, base **`auth_db`**).

No Windows / PowerShell, da raiz do repo (stack no ar):

```powershell
docker exec mongo-auth mongosh --quiet auth_db --eval 'print("usuarios:", db.usuarios.countDocuments())'
docker compose exec db-cliente psql -U user -d cliente_db -c "SELECT COUNT(*) FROM cliente;"
docker compose exec db-conta psql -U user -d conta_db -c "SELECT COUNT(*) FROM conta;"
docker compose exec db-gerente psql -U user -d gerente_db -c "SELECT COUNT(*) FROM gerente;"
```

(Se usar outro usuário Postgres no `.env`, troque `-U user`. Para listar objetos: `psql … -c "\dt"`.)

#### Variáveis de upstream no `gateway`

Definidas no Compose: `UPSTREAM_AUTH` → `http://ms-auth:8081`, `UPSTREAM_CLIENTE` → `http://ms-cliente:8082`, `UPSTREAM_CONTA` → `http://ms-conta:8083`, `UPSTREAM_GERENTE` → `http://ms-gerente:8084`, `UPSTREAM_SAGA` → `http://ms-saga:8085`, `UPSTREAM_FRONTEND` → `http://frontend:4200`.

---

### Página agregadora de documentação

Abra no navegador:

- `http://localhost/docs`

Lá aparecem links para o Swagger UI de cada microsserviço (quando configurado no gateway).

---

## 2. Onde abrir o Swagger UI de cada microsserviço

Abra **uma aba por serviço** (com os processos já rodando):


| Microsserviço | URL típica do Swagger UI                         |
| ------------- | ------------------------------------------------ |
| ms-auth       | `http://localhost:8081/auth/swagger-ui.html`     |
| ms-cliente    | `http://localhost:8082/clientes/swagger-ui.html` |
| ms-conta      | `http://localhost:8083/contas/swagger-ui.html`   |
| ms-gerente    | `http://localhost:8084/gerentes/swagger-ui.html` |


### OpenAPI JSON (import no Postman, etc.)

- `http://localhost:8081/auth/v3/api-docs`
- `http://localhost:8082/clientes/v3/api-docs`
- `http://localhost:8083/contas/v3/api-docs`
- `http://localhost:8084/gerentes/v3/api-docs`

---

## 3. Duas formas de chamar a API pelo Swagger

### A) Direto no microsserviço (porta 808x)

- **Vantagem:** menos problema com redirects do Swagger UI e paths absolutos.
- **Desvantagem:** você **não passa pelo gateway** (sem rate limit de login e sem ACL do gateway nesta camada).

### B) Via **Gateway** (`http://localhost/api/...`)

- **Vantagem:** cenário igual ao trabalho (**front só fala com o gateway**).
- **Desvantagem:** pela UI hospedada no MS, os **Try it out** chamam `:808x`. Para testes “iguais ao gateway”, prefira Postman/`curl` com `http://localhost/api/...`.

**Sugestão prática:**

- Fluxo “real”: **Postman/`curl`** com `**http://localhost/api/auth/login**` e `**POST http://localhost/api/clientes**`.
- Exploração de contratos e testes rápidos: **Swagger nas portas 808x**.

---

## 4. Fluxo 1 — Login (prioridade alta)

### 4.1 Carregar usuários de teste no MongoDB (ms-auth)

O endpoint `**GET /reboot`** no `ms-auth` **apaga todos os usuários** e recria a lista da especificação DAC. Senha padrão: `**tads`**.

**Via Swagger ms-auth** (`http://localhost:8081/auth/swagger-ui.html`):

1. Expanda `**GET /reboot`** (no controlador de inicialização).
2. **Try it out** → **Execute**.
3. Esperado: `200` com mensagem de sucesso.

**Via gateway** (público, sem Bearer):

```http
GET http://localhost/api/auth/reboot
```

(O gateway reescreve prefixo `/api/auth` para `/auth` no `ms-auth`.)

**Conferir o seed nos bancos:** veja a subseção **Infraestrutura: nomes Docker, rede e JDBC (este repositório)** no início deste guia (logo após a tabela de portas): Mongo `mongo-auth` / `auth_db` · Postgres `db-cliente` · `db-conta` · `db-gerente`.

### 4.2 Credenciais de exemplo (após seed)


| Perfil        | E-mail (login)        | Senha  |
| ------------- | --------------------- | ------ |
| CLIENTE       | `cli1@bantads.com.br` | `tads` |
| GERENTE       | `ger1@bantads.com.br` | `tads` |
| ADMINISTRADOR | `adm1@bantads.com.br` | `tads` |


Lista no código: `microservices/ms-auth/src/main/kotlin/bantads/auth/service/AuthSeedService.kt`.

### 4.3 Fazer login no Swagger (`ms-auth`)

1. `**POST /login**`.
2. Body (aceita `**login**` ou `**email**` + `**senha**`):

```json
{
  "login": "ger1@bantads.com.br",
  "senha": "tads"
}
```

1. Copie `**access_token**` da resposta.

### 4.4 Autorizar nos outros Swagger

No **Authorize** (`ms-cliente`, `ms-conta`, `ms-gerente`):

- Informe o token no esquema **Bearer** conforme a interface (só o JWT ou valor com prefixo, conforme o campo).

### 4.5 Logout e introspecção (opcional)

- `**POST /logout`** com `Authorization: Bearer <token>`.
- `**GET /introspect**` com o mesmo header — token válido e não revogado.

### 4.6 Rate limit (somente pelo gateway)

Muitas tentativas de `**POST /api/auth/login**` → possível **429**. Aguardar a janela indicada ou testar `**POST`** direto em `http://localhost:8081/auth/login`.

---

## 5. Fluxo 2 — Autocadastro (R1) e saga de aprovação

### 5.1 Fase 1 — Autocadastro (sem JWT)

O corpo deve ter **CPF com dígitos verificadores válidos**. Um CPF válido usado nos testes do projeto: `**52998224725`**.

Use um **e-mail que ainda não exista**.

**Swagger `ms-cliente`:** operação `**POST`** que cria recurso na raiz do `**/clientes**` (equivale a `POST http://localhost:8082/clientes/`).

**Via gateway (paridade com cenário oficial):**

```http
POST http://localhost/api/clientes
Content-Type: application/json

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

Campo `**CEP**` no JSON deve existir assim (maiúsculo), conforme o DTO usa `@JsonProperty("CEP")`.

Resposta esperada: **201 Created** com `**clienteId`** e mensagens orientando esperar análise do gerente.

### 5.2 Fase 2 — Gerente: pendentes e aprovação

1. Login `**ger1@bantads.com.br**` / `**tads**` → copiar token (**perfil GERENTE**).
2. No Swagger `ms-cliente`, **Authorize** com o Bearer.
3. `**GET /pendentes`** — o novo cliente deve aparecer como pendente.
4. `**POST /{id}/aprovar**` — substituir `{id}` pelo `**clienteId**` (UUID). Corpo pode ser `{}` ou omitido, conforme a UI permitir (`AprovarClienteRequest` opcional no controller).

Resposta típica: **202 Accepted** (passos seguintes são assíncronos via saga).

### 5.3 Acompanhar resultado


| Onde                                    | O quê conferir                                                     |
| --------------------------------------- | ------------------------------------------------------------------ |
| **RabbitMQ** (`http://localhost:15672`) | Filas/exchanges relacionados aos comandos                          |
| Logs                                    | `docker compose logs -f ms-saga` (e outros MS conforme necessário) |
| **MailHog** (`http://localhost:8025`)   | Envio pelo `ms-email` quando aplicável ao fluxo                    |


Passo-a-passo de mensagens: `**tutor/fluxo-autocadastro-fase1-fase2-rollback.md`**.

### 5.4 Rejeitar cliente (opcional)

Com Bearer **GERENTE**: `**POST /{id}/rejeitar`** com body contendo `**motivo**` (ver `**RejeitarClienteRequest**` no Swagger).

---

## 6. Outros fluxos (sanidade rápida)

### ms-conta (`/contas`)

- Consultas (`**GET**`), `**GET /{numero}/saldo**`, `**GET /{numero}/extrato**`
- `**GET /top3**`, `**GET /agregados/por-gerente**`
- Operações (`**POST**` depósito / saque / transferência) conforme modelo no Swagger.

### ms-gerente (`/gerentes`)

Listagem, `**stats**`, CRUD — perfis esperados são validados pelo **gateway** nas rotas `/api/gerentes/...`; ver `gateway/src/admin-routes.js` e outros ficheiros de ACL em `gateway/src/`.

---

## 7. Problemas comuns


| Sintoma                                  | Provável causa                    | Ação                                                                              |
| ---------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------- |
| Swagger não carrega                      | MS parado ou porta errada         | `docker compose ps`                                                               |
| Login **401**                            | Seed não aplicado ou senha errada | `GET http://localhost/api/auth/reboot` e repetir com `**tads`**                   |
| **403** ao usar `/api/...`               | JWT com perfil errado para a rota | Login com conta **CLIENTE**, **GERENTE** ou **ADMINISTRADOR** conforme a operação |
| Autocadastro **400** (CPF)               | DV inválido                       | Usar CPF válido (ex.: `**52998224725`**)                                          |
| Conflito de e-mail                       | E-mail já usado                   | Trocar o campo `**email**` no JSON                                                |
| **429** em login                         | Rate limit no gateway             | Aguardar ou `POST http://localhost:8081/auth/login`                               |
| Swagger redireciona mal via `:80`/`/api` | Redirect do SpringDoc             | Preferir Swagger em `**localhost:808x`**                                          |


---

## 8. Checklist “de ponta a ponta”

- `docker compose up -d` e serviços saudáveis.
- `GET http://localhost/health` no gateway.
- `GET http://localhost/api/auth/reboot` (seed dos utilizadores `**tads**`).
- Swagger **ms-auth** → `**POST /login`** como **cliente** e como **gerente** → `**access_token`** obtido.
- Swagger **ms-cliente** → `**POST`** autocadastro (CPF válido + e-mail único).
- Bearer **gerente** → `**GET /pendentes`** e `**POST /{id}/aprovar**`.
- RabbitMQ, logs `**ms-saga**` e MailHog conferidos segundo a especificação.

---

## Referências no repositório


| Ficheiro / pasta                                   | Conteúdo útil                                                    |
| -------------------------------------------------- | ---------------------------------------------------------------- |
| `microservices/ms-auth/.../AuthSeedService.kt`     | E-mails dos utilizadores seed e senha `**tads**`                 |
| `gateway/src/public-routes.js`                     | Rotas públicas: login, reboot, `**POST /api/clientes**`, Swagger |
| `tutor/fluxo-autocadastro-fase1-fase2-rollback.md` | Fluxo mensagem-a-mensagem da saga                                |


---

## 9. Testes com HTTPie Desktop

Esta seção refere-se ao **HTTPie Desktop** (aplicação com interface visual para Windows/Mac/Linux), disponível em [httpie.io/download](https://httpie.io/download).

Não confundir com o **HTTPie CLI** (`http …` na linha de comandos): o fluxo abaixo é só na app Desktop — embora você possa **exportar como comando HTTPie CLI** a partir de um pedido já montado (painel Preview / menu do pedido), se quiser repetir no terminal da mesma forma.

### 9.1 Instalação e arranque

1. Baixe e instale o **HTTPie for Desktop**.
2. Garanta que o stack está de pé (`docker compose up …`) como no restante deste documento.

### 9.2 Criar um *Space*, uma coleção e um ambiente

1. Abra ou crie um **Space** (ex.: «BANTADS»).
2. Crie uma **coleção**, por exemplo `Gateway — desenvolvimento local`.
3. Crie ou edite um **ambiente** com variáveis reutilizáveis (vá ao menu ou separador onde o HTTPie Desktop gerencia *environments*, conforme a [documentação oficial de variáveis](https://httpie.io/docs/desktop/defining-variables)):
   - `gateway` = `http://localhost` (use na URL: `{{gateway}}/api/...`; se você não usar porta explícita, vale a porta **80** mapeada no `docker-compose`.)
   - `token` (ou `access_token`) = deixe **vazio** no início; depois **cole** aqui o `access_token` retornado pelo login (**sem** o prefixo `Bearer`; no tipo de auth Bearer, o app já manda `Authorization: Bearer …`).

Ao criar cada pedido, onde o HTTPie aceitar variáveis, use a sintaxe `{{nomeDaVariável}}`.

### 9.3 Autenticação Bearer nos pedidos protegidos

Para **pendentes**, **aprovar**, etc., use o painel **Auth** na parte inferior do pedido:

- Escolha **Bearer token**.
- Digite o valor **`{{token}}`** (referência ao ambiente) **ou** cole temporariamente o JWT inteiro se ainda não configurou variável.

Você também pode configurar **auth ao nível da coleção** (herdada pelos pedidos), conforme a [documentação de collection auth](https://httpie.io/docs/desktop/defining-variables#collection-auth), para não repetir em cada endpoint.

---

### Fluxo passo-a-passo (Gateway `{{gateway}}`)

#### 9.4 Health (`GET`)

- Novo pedido · método **GET** · URL: `{{gateway}}/health`
- Sem corpo · **Send**.
- Esperado: `200`, corpo JSON com estado do gateway.

#### 9.5 Seed — reboot (`GET`, público)

- **GET** · `{{gateway}}/api/auth/reboot`
- **Send** · esperado `200` (recria utilizadores Mongo; todos com senha `tads`; operação **destrói** utilizadores antigos nesta base.)

#### 9.6 Login — gerente ou cliente (`POST`, público)

- **POST** · `{{gateway}}/api/auth/login`
- Corpo (**Body**) → modo **JSON** (`application/json`). Exemplo:

```json
{
  "login": "ger1@bantads.com.br",
  "senha": "tads"
}
```

- **Send**. Na **resposta**, copie o valor do campo **`access_token`**.
- Volte ao ambiente e **cole** esse valor na variável **`token`** (ou onde você configurou guardar o JWT). Os próximos pedidos com Bearer `{{token}}` passam a usar esse JWT.

**Rate limit (`429`):** se o gateway bloquear após vários logins, **faça o mesmo pedido** mudando apenas a URL para `http://localhost:8081/auth/login` — corpo JSON idêntico (endpoint direto no `ms-auth`).

#### 9.7 Autocadastro — R1 (`POST`, público)

- **POST** · `{{gateway}}/api/clientes`
- Body **JSON**:

```json
{
  "cpf": "52998224725",
  "email": "novocliente.desktop@example.com",
  "nome": "Fulano Silva",
  "telefone": "41999998888",
  "salario": 5000.00,
  "endereco": "Rua das Flores 100",
  "CEP": "80010000",
  "cidade": "Curitiba",
  "estado": "PR"
}
```

- **Altere** sempre o campo **`email`** se ele já existir na base (`409`, `400` ou conflito, conforme a API).
- O campo deve chamar‑se **`CEP`** em maiúsculas (nome JSON esperado pelo backend).
- **Send** · esperado `201`; anota **`clienteId`** (UUID).

#### 9.8 Pendentes — R9 (`GET`, JWT GERENTE)

- **GET** · `{{gateway}}/api/clientes/pendentes`
- **Auth**: Bearer **`{{token}}`**, usando token obtido pelo login **`ger1@…`** (perfil GERENTE).
- **Send** e **confirme** que o novo cliente aparece na lista.

#### 9.9 Aprovar — R10 (`POST`, JWT GERENTE)

- **POST** · `{{gateway}}/api/clientes/<UUID-do-clienteId>/aprovar`
- Auth: Bearer **`{{token}}`** (mesmo utilizador GERENTE).
- Corpo: você pode usar **corpo JSON vazio** `{}` ou deixar vazio conforme o Spring aceitar (o controller permite body opcional). Se aparecer erro por falta de body, **tente** apenas `{}` em JSON.
- **Send** · esperado `202`; o prosseguimento é **assíncrono** (RabbitMQ / saga).

Para **rejeitar**, use o mesmo padrão: **POST** `{{gateway}}/api/clientes/<UUID>/rejeitar` e corpo JSON com **`motivo`** (ver modelo no Swagger ou no DTO).

#### 9.10 Logout e introspecção (opcional)

Com Bearer **`{{token}}`** configurado neste mesmo pedido (ou herdado):

- **POST** `{{gateway}}/api/auth/logout`
- **GET** `{{gateway}}/api/auth/introspect`

Você também pode repetir o mesmo contra `http://localhost:8081/auth/...` se quiser testar só o **ms-auth** sem passar pelo gateway.

#### 9.11 Conta direto no microsserviço (opcional)

No HTTPie Desktop, vale criar outra coleção «MS direto» para estes testes.

- **GET** `http://localhost:8083/contas/<numero-da-conta>/saldo`
- Sem JWT obrigatório no lado do `ms-auth` porque o próprio **`ms-conta`** expõe hoje segurança **permitAll**; **no gateway** já existem ACL por perfil (ver `gateway/src/cliente-routes.js`).

---

### 9.12 Dicas úteis só no Desktop

| Objetivo | Onde encontrar na app |
|----------|-----------------------|
| Ver corpo bem formatado (JSON na resposta) | Painel de resposta · vista **JSON tree** ou filtro de dados quando disponível |
| Duplicar um pedido | Menu do pedido ou arrastar na biblioteca lateral |
| Compartilhar / backup do projeto | **Export…** de espaço, coleção ou ambiente (formato JSON) |
| Tirar comando para terminal | Preview do pedido → exportar **[HTTPie CLI](https://httpie.io/docs/desktop/defining-variables#export-httpie-cli)** ou **[cURL](https://httpie.io/docs/desktop/defining-variables#export-curl)** |
| Colar rápido `curl` desde o browser · DevTools | **Import…** dentro do **+** da biblioteca, ou tentar **colar cURL diretamente no campo URL** |

**Nota:** no HTTPie Desktop, o token **normalmente atualiza‑se manualmente** no ambiente após cada login (`access_token` copiado da resposta). Não há, na experiência habitual da app Desktop, garantia equivalente aos *tests* dos Postman que escrevem variáveis sozinhos — por isso o passo manual no **9.6** é intencional e fiável para o BANTADS.

---

### Resumo rápido

| Ordem | Operação na app | URL exemplo |
|------|-----------------|-------------|
| 1 | **GET** | `{{gateway}}/health` |
| 2 | **GET** | `{{gateway}}/api/auth/reboot` |
| 3 | **POST** login | `{{gateway}}/api/auth/login` — copiar `access_token` → variável **`{{token}}`** |
| 4 | **POST** autocadastro | `{{gateway}}/api/clientes` |
| 5 | **GET** | `{{gateway}}/api/clientes/pendentes` + Bearer **`{{token}}`** |
| 6 | **POST** aprovar | `{{gateway}}/api/clientes/<UUID>/aprovar` + Bearer **`{{token}}`** |

Este fluxo cobre **login**, **autocadastro** e envio (**aprovar**) usando **HTTPie Desktop**, alinhado ao gateway `http://localhost` do `docker-compose`.