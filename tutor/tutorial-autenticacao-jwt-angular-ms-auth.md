# Tutorial: Autenticação JWT entre Angular, API Gateway e ms-auth (Spring Boot / Kotlin)

Este documento explica o fluxo de autenticação do projeto **BANTADS**: do login no Angular até a emissão e validação do JWT no **ms-auth** e no **API Gateway** (Node.js). Referências apontam para arquivos e trechos do repositório.

> **Nota:** O arquivo `docs/CODIGO_FRONTEND_PARA_GEMINI.txt` é um export que pode estar desatualizado (ex.: modo demo em memória). O fluxo descrito aqui segue o **código versionado** em `frontend/`, `gateway/` e `microservices/ms-auth/`.

---

## 1. Visão geral do fluxo

1. O **Angular** envia `POST /api/auth/login` com corpo `{ login, senha }`.
2. O **API Gateway** (Fastify) identifica a rota como **pública** e **não** exige header `Authorization`.
3. O gateway **encaminha** a requisição ao **ms-auth** como `POST /auth/login` (reescrita de prefixo: `/api/auth` → `/auth` no upstream).
4. O **ms-auth** valida credenciais no **MongoDB**, gera um **JWT assinado (HS512)** e devolve JSON no estilo OAuth2 (`access_token`, `token_type`, `tipo`, `usuario`).
5. O **Angular** persiste `access_token` e o usuário mapeado no **`sessionStorage`** e atualiza **signals** no `AuthService`.
6. Nas requisições seguintes (`/api/clientes`, `/api/contas`, …), o **interceptor HTTP** anexa `Authorization: Bearer <token>`.
7. O **gateway** valida o JWT **antes** de repassar aos microsserviços (exceto rotas públicas definidas em `gateway/src/public-routes.js`).

Isso atende à regra acadêmica: **o front-end só conversa com o gateway**; o gateway roteia para os microsserviços.

---

## 2. Angular

### 2.1 Registro global do interceptor HTTP

**Arquivo:** `frontend/src/app/app.config.ts`

O `provideHttpClient(withInterceptors([authInterceptor]))` garante que **toda** chamada feita com `HttpClient` passe pelo interceptor — único ponto para anexar `Bearer` e tratar `401`.

```typescript
// Trecho conceitual — ver arquivo completo no repositório
provideHttpClient(withInterceptors([authInterceptor])),
```

**Por quê:** evita repetir headers em cada serviço e mantém política de autenticação centralizada.

---

### 2.2 Tela de login: formulário → credenciais

**Arquivo:** `frontend/src/app/features/auth/login/login.component.ts`

- Valida e-mail e senha (mínimo 4 caracteres, alinhado ao Bean Validation do ms-auth).
- Normaliza `login` com `trim().toLowerCase()`.
- Chama `AuthService.login(credenciais)`.
- Em sucesso, `redirecionarPorPerfil()` usa `AuthService.getHomeUrl()`.

**Por quê normalizar o login:** o backend indexa usuário por string de login (e-mail); diferenças de maiúsculas/minúsculas podem causar falhas desnecessárias.

---

### 2.3 Modelos TypeScript (DTOs no front)

**Arquivo:** `frontend/src/app/shared/models/auth/auth.model.ts`

| Interface | Papel |
|-----------|--------|
| `LoginRequest` | Corpo enviado no `POST` — espelha o DTO Kotlin `LoginRequest`. |
| `LoginApiResponse` | Forma **exata** da resposta JSON do servidor (`access_token`, `token_type`, etc.). |
| `LoginResponse` | Forma **interna** após mapeamento (`token`, `usuario: UsuarioLogado`). |
| `UsuarioLogado` | Estado do usuário na UI (inclui `perfil` como `'CLIENTE' \| 'GERENTE' \| 'ADMIN'`). |

**Por quê separar `LoginApiResponse` de `LoginResponse`:** o contrato da API (snake_case, `ADMINISTRADOR`) não precisa poluir o restante do app; o `AuthService` faz o mapeamento.

---

### 2.4 AuthService: HTTP, mapeamento e sessão

**Arquivo:** `frontend/src/app/core/services/auth.service.ts`

**Login via gateway:**

- `POST` relativo: `'/api/auth/login'` — mesma origem quando o browser fala com o gateway (Compose: **`http://localhost`** na porta **80**; desenvolvimento local direto ao Angular pode ser **`http://localhost:4200`**, mas aí o caminho da API depende do proxy do `ng serve`).
- Tipagem da resposta: `HttpClient.post<LoginApiResponse>(...)`.
- `tap`: ao receber resposta, chama `saveSession(usuario, raw.access_token)`.
- `map`: converte para `LoginResponse` com `token: raw.access_token`.

**Mapeamento de perfil (`mapPerfil`):**

- `ADMINISTRADOR` → `ADMIN` (usado em guards e rotas).
- `GERENTE` → `GERENTE`.
- Demais → `CLIENTE`.

**Sessão:**

- Chaves: `bantads_token`, `bantads_user` no **`sessionStorage`** (não `localStorage`, alinhado às regras da disciplina).
- Estado reativo: `signal` para token e usuário; `computed` para `isAuthenticated`, `userRole`, etc.

**Expiração do JWT (`readJwtExpSeconds`):**

- Decodifica o payload (segundo segmento do JWT em Base64) só para ler o claim `exp`.
- **Não valida assinatura no browser** — quem valida criptograficamente é o gateway (e o ms-auth em fluxos como logout).

---

### 2.5 Interceptor: anexar Bearer e tratar 401

**Arquivo:** `frontend/src/app/core/interceptors/auth.interceptor.ts`

- Se existe token: `req.clone({ setHeaders: { Authorization: \`Bearer ${token}\` } })`.
- Em erro `401` com token presente e URL **não** é login: `logout()` + navegação para `/auth/login`.

**Por quê excluir `/api/auth/login`:** evitar loop ou logout indevido se o próprio login falhar.

---

## 3. API Gateway (Node.js / Fastify)

### 3.1 Rotas públicas

**Arquivo:** `gateway/src/public-routes.js`

Exemplos públicos (sem `Authorization`):

- `POST /api/auth/login`
- `GET /api/auth/reboot` (se existir no auth)
- `POST /api/clientes` (autocadastro R1)

Demais `/api/*` exigem `Bearer` válido.

---

### 3.2 Validação JWT no `onRequest`

**Arquivo:** `gateway/src/app.js`

Fluxo resumido:

1. Se o path não começa com `/api`, o hook retorna (ex.: assets do front).
2. Se `isPublicApiRoute(method, url)`, retorna.
3. Exige header `Authorization: Bearer ...`.
4. `verifyAccessToken(token, JWT_SECRET)` — implementação em `gateway/src/jwt.js`.
5. Preenche `request.gatewayUser` com `sub`, `tipo`, `perfil` extraídos do payload.
6. Regras extras (ex.: rotas de gerente) podem retornar `403`.

**Proxy para ms-auth:**

```javascript
// gateway/src/app.js — trecho de registro do proxy
await fastify.register(fastifyHttpProxy, {
  upstream: upstreams.auth,
  prefix: '/api/auth',
  rewritePrefix: '/auth',
})
```

Ou seja: chamada do browser `POST /api/auth/login` → upstream `POST {UPSTREAM_AUTH}/auth/login`.

Variável de ambiente típica: `UPSTREAM_AUTH` (ex.: `http://ms-auth:8081` no Docker). Ver `docker-compose.yml`.

---

### 3.3 Verificação do token (mesmo algoritmo que o ms-auth)

**Arquivo:** `gateway/src/jwt.js`

- Deriva a chave HMAC: **SHA-512 do segredo UTF-8**, igual ao comentário e à implementação em `JwtService` do Kotlin.
- `jwt.verify` com algoritmo **`HS512`**.

**Importante:** `JWT_SECRET` no gateway deve ser o **mesmo** valor lógico que `jwt.secret` no `ms-auth` (`application.yaml` / env), senão todos os tokens serão rejeitados com401.

---

## 4. ms-auth (Kotlin / Spring Boot)

### 4.1 Context path do serviço

**Arquivo:** `microservices/ms-auth/src/main/resources/application.yaml`

```yaml
server:
  port: 8081
  servlet:
    context-path: /auth
```

O controller mapeia `/login` → URL absoluta base **`/auth/login`**.

---

### 4.2 DTO de entrada: LoginRequest

**Arquivo:** `microservices/ms-auth/src/main/kotlin/bantads/auth/dto/LoginRequest.kt`

- Campos: `login`, `senha` com validação Jakarta (`@NotBlank`, `@Size(min = 4)`).
- `@JsonAlias("email")` no campo `login`: aceita JSON com `"email"` no lugar de `"login"`.

**Transferência:** JSON do cliente → objeto Kotlin imutável; usado em `AuthController` com `@Valid`.

---

### 4.3 Controller

**Arquivo:** `microservices/ms-auth/src/main/kotlin/bantads/auth/controller/AuthController.kt`

- `POST /login` → `authService.autenticar(request)` → `ResponseEntity<LoginResponse>`.
- `POST /logout` → lê `Authorization`, extrai o token Bearer, chama `authService.logout(token)`.

---

### 4.4 Serviço de autenticação

**Arquivo:** `microservices/ms-auth/src/main/kotlin/bantads/auth/service/AuthService.kt`

`autenticar(request: LoginRequest)`:

1. `userRepository.findByLogin(request.login)` — se ausente, `BadCredentialsException`.
2. `passwordHasher.matches(senha, salt, senhaHash)` — senha nunca comparada em texto puro com o que está no banco.
3. `jwtService.gerarToken(user.login, user.perfil)`.
4. Monta `UsuarioLoginResponse` (cpf, nome, email, tipo).
5. Retorna `LoginResponse(accessToken, tokenType = Bearer, tipo, usuario)`.

A entidade persistida é `User` (MongoDB); o cliente recebe apenas DTOs.

---

### 4.5 DTOs de saída

**Arquivo:** `microservices/ms-auth/src/main/kotlin/bantads/auth/dto/LoginResponse.kt`

- `accessToken` serializado como **`access_token`** via `@JsonProperty("access_token")`.
- `tokenType` como **`token_type`** (padrão `Bearer`).

**Arquivo:** `microservices/ms-auth/src/main/kotlin/bantads/auth/dto/UsuarioLoginResponse.kt`

- Campos: `cpf`, `nome`, `email`, `tipo` (perfil vindo do banco: `CLIENTE`, `GERENTE`, `ADMINISTRADOR`).

**Arquivo:** `microservices/ms-auth/src/main/kotlin/bantads/auth/dto/LogoutResponse.kt`

- Resposta do logout: `cpf`, `nome`, `email`, `tipo`.

---

### 4.6 JwtService — conteúdo do token

**Arquivo:** `microservices/ms-auth/src/main/kotlin/bantads/auth/security/JwtService.kt`

Claims principais:

- **`sub` (subject):** login do usuário (e-mail) — usado pelo gateway como `payload.sub`.
- **`perfil` e `tipo`:** perfil armazenado (redundância útil para o gateway ler `tipo` ou `perfil`).
- **`exp`:** expiração; duração configurável (`jwt.expiration` em ms no `application.yaml`).

Chave de assinatura: derivada por **SHA-512** do segredo UTF-8, compatível com `gateway/src/jwt.js`.

---

### 4.7 Modelo de usuário (persistência)

**Arquivo:** `microservices/ms-auth/src/main/kotlin/bantads/auth/model/User.kt`

- Coleção Mongo: `usuarios`.
- Campos relevantes: `login` (único), `senhaHash`, `salt`, `nome`, `cpf`, `perfil` (`CLIENTE | GERENTE | ADMINISTRADOR`).

---

### 4.8 Spring Security no ms-auth

**Arquivo:** `microservices/ms-auth/src/main/kotlin/bantads/auth/config/SecurityConfig.kt`

- CSRF desabilitado (API REST).
- `anyRequest().permitAll()` — neste projeto, a **barreira principal** para APIs protegidas está no **gateway**; o ms-auth ainda valida credenciais no login e assina o JWT; o logout valida o token no serviço.

---

## 5. DTOs: papel na transferência de dados

| Camada | Exemplo | Função |
|--------|---------|--------|
| HTTP JSON → Kotlin | `LoginRequest` | Deserialização + validação; não expõe entidade. |
| Kotlin → HTTP JSON | `LoginResponse`, `UsuarioLoginResponse` | Contrato estável com o front/Swagger; nomes JSON via `@JsonProperty`. |
| HTTP JSON → TypeScript | `LoginApiResponse` | Tipagem fiel ao wire format. |
| Domínio Angular | `UsuarioLogado`, `LoginResponse` | Modelo da aplicação; isolado de mudanças de nomenclatura da API. |

**Princípio:** entidades (`User`) ficam no persistence layer; **DTOs** cruzam a fronteira HTTP.

---

## 6. O que o JWT carrega hoje vs. o que vem no corpo do login

- **No JWT:** `sub` = login (e-mail), `perfil`/`tipo`, `iat`, `exp`.
- **No corpo do login (`usuario`):** `cpf`, `nome`, `email`, `tipo`.

O Angular guarda **CPF** a partir do JSON de login, não do payload do JWT. Se outros microsserviços precisarem só do token, podem usar `sub` e perfil; para CPF, o desenho pode evoluir (claim extra no JWT, ou consulta ao `ms-cliente` com autorização).

---

## 7. Testes de integração (referência)

**Arquivo:** `microservices/ms-auth/src/test/kotlin/bantads/auth/MsAuthIntegrationTest.kt`

- Exercita `POST /auth/login`, espera `access_token` e `token_type` Bearer.
- Testa login inválido (401) e fluxo de logout com header Bearer.

Útil para ver o contrato HTTP “de ponta a ponta” dentro do ms-auth.

---

## 8. Checklist rápido para debug

| Sintoma | Onde olhar |
|---------|------------|
| 401 em todas as APIs após login | `JWT_SECRET` no gateway vs `jwt.secret` no ms-auth; algoritmo HS512. |
| 404 no login | URL deve ser `/api/auth/login` no browser; ms-auth com `context-path: /auth` e controller `/login`. |
| Perfil errado no front | `mapPerfil` em `auth.service.ts` e valor `tipo` vindo do banco (`ADMINISTRADOR`). |
| Login aceita só `email` no JSON | `JsonAlias("email")` em `LoginRequest.kt`. |

---

## 9. Arquivos principais (índice)

| Caminho | Responsabilidade |
|---------|------------------|
| `frontend/src/app/app.config.ts` | Registro do `authInterceptor`. |
| `frontend/src/app/core/services/auth.service.ts` | Login, sessão, mapeamento JWT/usuário. |
| `frontend/src/app/core/interceptors/auth.interceptor.ts` | Header `Authorization` e tratamento 401. |
| `frontend/src/app/shared/models/auth/auth.model.ts` | DTOs TypeScript. |
| `frontend/src/app/features/auth/login/login.component.ts` | UI e submissão do login. |
| `gateway/src/app.js` | Hook JWT, proxies, inclusão `/api/auth`. |
| `gateway/src/jwt.js` | Verificação HS512. |
| `gateway/src/public-routes.js` | Rotas sem Bearer. |
| `microservices/ms-auth/src/main/resources/application.yaml` | Porta, context-path, `jwt.*`, Mongo. |
| `microservices/ms-auth/.../AuthController.kt` | Endpoints login/logout. |
| `microservices/ms-auth/.../AuthService.kt` | Regras de autenticação e montagem de resposta. |
| `microservices/ms-auth/.../JwtService.kt` | Emissão e parsing do JWT. |
| `microservices/ms-auth/.../dto/*.kt` | DTOs Kotlin de request/response. |
| `microservices/ms-auth/.../config/SecurityConfig.kt` | Permit all no Spring Security. |

---

*Documento gerado como material de estudo (tutor dev senior) para o repositório BANTADS.*
