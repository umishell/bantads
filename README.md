# BANTADS

Projeto inicial desenvolvido em **Angular** para a disciplina DAC.

Este repositório marca o início da estrutura base da aplicação, servindo como fundação para o desenvolvimento das próximas etapas do sistema.

---

## Sumário

- [Sobre o projeto](#sobre-o-projeto)
- [Tecnologias e versões](#tecnologias-e-versões)
- [Opções escolhidas na criação](#opções-escolhidas-na-criação)
- [Como clonar e executar](#como-clonar-e-executar)
- [Estrutura atual do projeto](#estrutura-atual-do-projeto)
- [Observações](#observações)
- [Autores](#autores)

---

## Sobre o projeto

Este projeto foi gerado com **Angular CLI 20.1.6**.

O objetivo deste repositório é organizar, documentar e acompanhar a evolução do sistema ao longo do desenvolvimento.

---

## Tecnologias e versões

As versões utilizadas na criação inicial do projeto foram:

- **Node.js:** `v22.18.0 LTS`
- **npm:** `10.9.3`
- **Angular CLI:** `20.1.6`
- **Angular:** `20.1.6`

---

## Opções escolhidas na criação

Durante a criação do projeto Angular, foram selecionadas as seguintes opções:

- **Compartilhamento de dados de uso com a equipe do Angular:** `Não`
- **Formato de stylesheet:** `SCSS`
- **Server-Side Rendering (SSR):** `Não`
- **Static Site Generation (SSG / Prerendering):** `Não`
- **Aplicação zoneless, sem zone.js:** `Não`
- **Routing:** `Sim`

---

## Como clonar e executar

### 1. Clonar o repositório

```bash
git clone https://github.com/umishell/bantads.git
```

### 2. Entrar na pasta do projeto

```bash
cd bantads
```

### 3. Instalar as dependências

```bash
npm install
```

### 4. Executar o projeto em ambiente de desenvolvimento

```bash
ng serve
```

ou

```bash
npm start
```

### 5. Acessar no navegador

Abra:

```bash
http://localhost:4200
```

Ou o localhost atual.

---

## Estrutura atual do projeto

> Esta árvore de arquivos será atualizada com frequência conforme o projeto evoluir.

```bash
C:.
|   .gitattributes
|   .gitignore
|   docker-compose.yml
|   package-lock.json
|   README.md
|
+---frontend
|   |   .dockerignore
|   |   .editorconfig
|   |   .gitignore
|   |   angular.json
|   |   Dockerfile
|   |   nginx.conf
|   |   package-lock.json
|   |   package.json
|   |   README.md
|   |   tsconfig.app.json
|   |   tsconfig.json
|   |   tsconfig.spec.json
|   |
|   +---public
|   |       favicon.ico
|   |
|   \---src
|       |   index.html
|       |   main.ts
|       |   styles.scss
|       |
|       \---app
|           |   app.config.ts
|           |   app.html
|           |   app.routes.ts
|           |   app.scss
|           |   app.spec.ts
|           |   app.ts
|           |
|           +---core
|           |   +---guards
|           |   |       auth.guard.ts
|           |   |       role.guard.ts
|           |   |
|           |   +---interceptors
|           |   |       auth.interceptor.ts
|           |   |
|           |   \---services
|           |           auth.service.ts
|           |
|           +---features
|           |   |   ROTAS_E_LOGINS.md
|           |   |
|           |   +---admin
|           |   |   |   admin.routes.ts
|           |   |   |
|           |   |   \---pages
|           |   |       +---gerentes
|           |   |       |       gerentes.html
|           |   |       |       gerentes.scss
|           |   |       |       gerentes.spec.ts
|           |   |       |       gerentes.ts
|           |   |       |
|           |   |       +---home
|           |   |       |       home.html
|           |   |       |       home.scss
|           |   |       |       home.spec.ts
|           |   |       |       home.ts
|           |   |       |
|           |   |       \---relatorio-clientes
|           |   |               relatorio-clientes.html
|           |   |               relatorio-clientes.scss
|           |   |               relatorio-clientes.spec.ts
|           |   |               relatorio-clientes.ts
|           |   |
|           |   +---auth
|           |   |   |   auth.routes.ts
|           |   |   |
|           |   |   +---autocadastro
|           |   |   |       autocadastro.component.html
|           |   |   |       autocadastro.component.scss
|           |   |   |       autocadastro.component.ts
|           |   |   |       Old_autocadastro.component.html
|           |   |   |       Old_autocadastro.component.scss
|           |   |   |       Old_autocadastro.component.ts
|           |   |   |
|           |   |   \---login
|           |   |           login.component.html
|           |   |           login.component.scss
|           |   |           login.component.ts
|           |   |           old_login.component.html
|           |   |           old_login.component.scss
|           |   |           old_login.component.ts
|           |   |
|           |   +---cliente
|           |   |   |   cliente.routes.ts
|           |   |   |
|           |   |   \---pages
|           |   |       +---deposito
|           |   |       |       deposito.html
|           |   |       |       deposito.scss
|           |   |       |       deposito.spec.ts
|           |   |       |       deposito.ts
|           |   |       |
|           |   |       +---extrato
|           |   |       |       extrato.html
|           |   |       |       extrato.scss
|           |   |       |       extrato.spec.ts
|           |   |       |       extrato.ts
|           |   |       |
|           |   |       +---home
|           |   |       |       home.html
|           |   |       |       home.scss
|           |   |       |       home.spec.ts
|           |   |       |       home.ts
|           |   |       |
|           |   |       +---perfil
|           |   |       |       perfil.html
|           |   |       |       perfil.scss
|           |   |       |       perfil.spec.ts
|           |   |       |       perfil.ts
|           |   |       |
|           |   |       +---saque
|           |   |       |       saque.html
|           |   |       |       saque.scss
|           |   |       |       saque.spec.ts
|           |   |       |       saque.ts
|           |   |       |
|           |   |       \---transferencia
|           |   |               transferencia.html
|           |   |               transferencia.scss
|           |   |               transferencia.spec.ts
|           |   |               transferencia.ts
|           |   |
|           |   \---gerente
|           |       |   gerente.routes.ts
|           |       |
|           |       \---pages
|           |           +---clientes
|           |           |       clientes.html
|           |           |       clientes.scss
|           |           |       clientes.spec.ts
|           |           |       clientes.ts
|           |           |
|           |           +---consulta
|           |           |       consulta.html
|           |           |       consulta.scss
|           |           |       consulta.spec.ts
|           |           |       consulta.ts
|           |           |
|           |           +---home
|           |           |       home.html
|           |           |       home.scss
|           |           |       home.spec.ts
|           |           |       home.ts
|           |           |
|           |           \---melhores-clientes
|           |                   melhores-clientes.html
|           |                   melhores-clientes.scss
|           |                   melhores-clientes.spec.ts
|           |                   melhores-clientes.ts
|           |
|           \---shared
|               +---models
|               |   +---admin
|               |   |       admin.model.ts
|               |   |
|               |   +---auth
|               |   |       auth.model.ts
|               |   |
|               |   +---cliente
|               |   |       cliente.model.ts
|               |   |
|               |   +---conta
|               |   |       extrato-dia.model.ts
|               |   |       extrato-filtro.model.ts
|               |   |       extrato-movimentacao.model.ts
|               |   |       extrato-response.model.ts
|               |   |       transferencia-request.model.ts
|               |   |       transferencia-response.model.ts
|               |   |
|               |   \---gerente
|               |           gerente.model.ts
|               |
|               \---services
|                       admin.service.ts
|                       cliente.service.ts
|                       conta.service.ts
|                       demo-bantads-store.service.ts
|                       gerente.service.ts
|
+---gateway
|   |   .dockerignore
|   |   Dockerfile
|   |   package-lock.json
|   |   package.json
|   |
|   \---src
|           app.js
|           gerente-routes.js
|           jwt.js
|           public-routes.js
|
+---microservices
|   +---ms-auth
|   |   |   .gitattributes
|   |   |   .gitignore
|   |   |   build.gradle.kts
|   |   |   Dockerfile
|   |   |   gradlew
|   |   |   gradlew.bat
|   |   |   settings.gradle.kts
|   |   |
|   |   +---gradle
|   |   |   \---wrapper
|   |   |           gradle-wrapper.jar
|   |   |           gradle-wrapper.properties
|   |   |
|   |   \---src
|   |       +---main
|   |       |   +---kotlin
|   |       |   |   \---bantads
|   |       |   |       \---auth
|   |       |   |           |   MsAuthApplication.kt
|   |       |   |           |
|   |       |   |           +---config
|   |       |   |           |       JacksonConfig.kt
|   |       |   |           |       RabbitConfig.kt
|   |       |   |           |       SecurityConfig.kt
|   |       |   |           |       StartupSeed.kt
|   |       |   |           |
|   |       |   |           +---controller
|   |       |   |           |       AuthController.kt
|   |       |   |           |       InitController.kt
|   |       |   |           |       RestExceptionHandler.kt
|   |       |   |           |
|   |       |   |           +---dto
|   |       |   |           |       ErrorResponse.kt
|   |       |   |           |       LoginRequest.kt
|   |       |   |           |       LoginResponse.kt
|   |       |   |           |       LogoutResponse.kt
|   |       |   |           |       UserDTO.kt
|   |       |   |           |       UsuarioLoginResponse.kt
|   |       |   |           |
|   |       |   |           +---messaging
|   |       |   |           |       AuthCommandListener.kt
|   |       |   |           |       SagaResponsePublisher.kt
|   |       |   |           |
|   |       |   |           +---model
|   |       |   |           |       User.kt
|   |       |   |           |
|   |       |   |           +---repository
|   |       |   |           |       UserRepository.kt
|   |       |   |           |
|   |       |   |           +---security
|   |       |   |           |       JwtService.kt
|   |       |   |           |       Sha256SaltPasswordHasher.kt
|   |       |   |           |
|   |       |   |           \---service
|   |       |   |                   AuthSeedService.kt
|   |       |   |                   AuthService.kt
|   |       |   |
|   |       |   \---resources
|   |       |           application.yaml
|   |       |
|   |       \---test
|   |           \---kotlin
|   |               \---bantads
|   |                   \---auth
|   |                           AuthServiceTest.kt
|   |                           LoginRequestJsonTest.kt
|   |                           MsAuthIntegrationTest.kt
|   |                           Sha256SaltPasswordHasherTest.kt
|   |
|   +---ms-cliente
|   |   |   build.gradle.kts
|   |   |   Dockerfile
|   |   |   gradle.properties
|   |   |   gradlew
|   |   |   gradlew.bat
|   |   |   settings.gradle.kts
|   |   |
|   |   +---gradle
|   |   |   \---wrapper
|   |   |           gradle-wrapper.jar
|   |   |           gradle-wrapper.properties
|   |   |
|   |   \---src
|   |       +---main
|   |       |   +---kotlin
|   |       |   |   \---bantads
|   |       |   |       \---cliente
|   |       |   |           |   MsClienteApplication.kt
|   |       |   |           |
|   |       |   |           +---config
|   |       |   |           |       JacksonConfig.kt
|   |       |   |           |       RabbitConfig.kt
|   |       |   |           |       SagaProperties.kt
|   |       |   |           |       SecurityConfig.kt
|   |       |   |           |
|   |       |   |           +---controller
|   |       |   |           |       ClienteController.kt
|   |       |   |           |       RestExceptionHandler.kt
|   |       |   |           |
|   |       |   |           +---dto
|   |       |   |           |       AprovarClienteRequest.kt
|   |       |   |           |       AutocadastroRequest.kt
|   |       |   |           |       AutocadastroResponse.kt
|   |       |   |           |       ClientePendenteListItemResponse.kt
|   |       |   |           |       RejeitarClienteRequest.kt
|   |       |   |           |
|   |       |   |           +---exception
|   |       |   |           |       CpfJaCadastradoException.kt
|   |       |   |           |       EstadoClienteInvalidoException.kt
|   |       |   |           |
|   |       |   |           +---messaging
|   |       |   |           |       ClienteCommandListener.kt
|   |       |   |           |       ClienteSagaPublisher.kt
|   |       |   |           |
|   |       |   |           +---model
|   |       |   |           |       Cliente.kt
|   |       |   |           |       StatusCliente.kt
|   |       |   |           |
|   |       |   |           +---repository
|   |       |   |           |       ClienteRepository.kt
|   |       |   |           |
|   |       |   |           +---saga
|   |       |   |           |       SagaAprovacaoClientePolicy.kt
|   |       |   |           |
|   |       |   |           \---service
|   |       |   |                   ClienteService.kt
|   |       |   |
|   |       |   \---resources
|   |       |           application.yaml
|   |       |
|   |       \---test
|   |           \---kotlin
|   |               \---bantads
|   |                   \---cliente
|   |                           ClienteServiceTest.kt
|   |
|   +---ms-conta
|   |   |   build.gradle.kts
|   |   |   Dockerfile
|   |   |   gradlew
|   |   |   gradlew.bat
|   |   |   settings.gradle.kts
|   |   |
|   |   +---gradle
|   |   |   \---wrapper
|   |   |           gradle-wrapper.jar
|   |   |           gradle-wrapper.properties
|   |   |
|   |   \---src
|   |       \---main
|   |           +---kotlin
|   |           |   \---bantads
|   |           |       \---conta
|   |           |           |   MsContaApplication.kt
|   |           |           |
|   |           |           +---config
|   |           |           |       JacksonConfig.kt
|   |           |           |       RabbitConfig.kt
|   |           |           |       SecurityConfig.kt
|   |           |           |
|   |           |           +---messaging
|   |           |           |       ContaCommandListener.kt
|   |           |           |       SagaResponsePublisher.kt
|   |           |           |
|   |           |           +---model
|   |           |           |       Conta.kt
|   |           |           |
|   |           |           \---repository
|   |           |                   ContaRepository.kt
|   |           |
|   |           \---resources
|   |                   application.yaml
|   |
|   +---ms-email
|   |   |   build.gradle.kts
|   |   |   Dockerfile
|   |   |   gradlew
|   |   |   gradlew.bat
|   |   |   settings.gradle.kts
|   |   |
|   |   +---gradle
|   |   |   \---wrapper
|   |   |           gradle-wrapper.jar
|   |   |           gradle-wrapper.properties
|   |   |
|   |   \---src
|   |       \---main
|   |           +---kotlin
|   |           |   \---bantads
|   |           |       \---email
|   |           |           |   MsEmailApplication.kt
|   |           |           |
|   |           |           +---config
|   |           |           |       JacksonConfig.kt
|   |           |           |       RabbitConfig.kt
|   |           |           |
|   |           |           \---messaging
|   |           |                   EmailCommandListener.kt
|   |           |                   SagaResponsePublisher.kt
|   |           |
|   |           \---resources
|   |                   application.yaml
|   |
|   +---ms-gerente
|   |   |   build.gradle.kts
|   |   |   Dockerfile
|   |   |   gradlew
|   |   |   gradlew.bat
|   |   |   settings.gradle.kts
|   |   |
|   |   +---gradle
|   |   |   \---wrapper
|   |   |           gradle-wrapper.jar
|   |   |           gradle-wrapper.properties
|   |   |
|   |   \---src
|   |       \---main
|   |           +---kotlin
|   |           |   \---bantads
|   |           |       \---gerente
|   |           |           |   MsGerenteApplication.kt
|   |           |           |
|   |           |           +---config
|   |           |           |       GerenteSeed.kt
|   |           |           |       JacksonConfig.kt
|   |           |           |       RabbitConfig.kt
|   |           |           |       SecurityConfig.kt
|   |           |           |
|   |           |           +---messaging
|   |           |           |       GerenteCommandListener.kt
|   |           |           |       SagaResponsePublisher.kt
|   |           |           |
|   |           |           +---model
|   |           |           |       Gerente.kt
|   |           |           |
|   |           |           \---repository
|   |           |                   GerenteRepository.kt
|   |           |
|   |           \---resources
|   |                   application.yaml
|   |
|   \---ms-saga-orchestrator
|       |   build.gradle.kts
|       |   Dockerfile
|       |   gradlew
|       |   gradlew.bat
|       |   settings.gradle.kts
|       |
|       +---gradle
|       |   \---wrapper
|       |           gradle-wrapper.jar
|       |           gradle-wrapper.properties
|       |
|       \---src
|           \---main
|               +---kotlin
|               |   \---bantads
|               |       \---saga
|               |           |   MsSagaApplication.kt
|               |           |
|               |           +---config
|               |           |       RabbitConfig.kt
|               |           |       SagaProperties.kt
|               |           |
|               |           +---engine
|               |           |       ApprovalSagaContext.kt
|               |           |       ApprovalStep.kt
|               |           |       SagaOrchestrator.kt
|               |           |
|               |           \---listener
|               |                   SagaRabbitListeners.kt
|               |
|               \---resources
|                       application.yaml
|
+---scripts
|       docker-compose-build-one-by-one.ps1
|
+---sql
|       01_bantads_schema.sql
|       02_bantads_logic_triggers.sql
|       03_bantads_mock_data.sql
|
\---tutor
        fluxo-autocadastro-fase1-fase2-rollback.md
        tutorial-autenticacao-jwt-angular-ms-auth.md
```

---

## Saga BANTADS — autocadastro em duas fases (decisões fixas)

Esta seção registra decisões únicas para o trabalho DAC / BANTADS (alinhadas ao enunciado). O código-fonte do
`ms-cliente` repete as constantes em `SagaAprovacaoClientePolicy` para quem implementar a saga e os demais MS.

### Métrica de menor carga do gerente

- **O que conta:** número de **contas ativas** no **`ms-conta`** (PostgreSQL) por gerente responsável.
- **Por quê:** o requisito R1 associa o gerente ao **cliente/conta**; usar o banco de contas como fonte evita
  divergência entre “clientes” e “contas”.
- **Empate:** gerente com **menor CPF** (string de 11 dígitos; ordem lexicográfica).

### Política de falha, retry e status do cliente

- **E-mail:** até **3** tentativas no passo `ms-email` antes de considerar falha terminal desse passo.
- **Após falha terminal da saga** (e compensações aplicáveis): o cliente em `PROCESSANDO_APROVACAO` volta para
  **`PENDENTE_APROVACAO`**, para o gerente poder **reaprovar**. Não há estado `ERRO_PROCESSAMENTO` neste desenho.
- **Compensação:** executar na ordem inversa ao fluxo feliz (ver matriz do enunciado); logs **sem** senha em claro.

### Stack Docker (`docker compose`)

Serviços principais: **RabbitMQ**, **MongoDB** (`ms-auth`), **PostgreSQL** (cliente / conta / gerente), **ms-saga-orchestrator**
(hub de comandos assíncronos), **ms-conta**, **ms-gerente**, **ms-email** (SMTP → **MailHog** em dev, UI em
http://localhost:8025), **ms-cliente**, **ms-auth**, **gateway** (porta 80) e **frontend**.

Mensagens entre microsserviços de negócio passam pela **saga** (filas `cmd.*` e `saga-response-exchange`). O gateway exige
**JWT perfil GERENTE** em `GET /api/clientes/pendentes` e em `POST /api/clientes/{id}/aprovar|rejeitar`.

---

## Observações

- Este README representa a **versão inicial** da documentação do projeto.

- A estrutura, dependências e instruções poderão ser atualizadas ao longo do desenvolvimento.

- Recomenda-se manter este arquivo sempre atualizado para facilitar organização, manutenção e entendimento do sistema.

---

## Autores

Gabriela Harres Rodrigues           - GRR20246215 -         gabrielahrodrigus101@gmail.com

Michel Abril Marinho                - GRR20223411 -         umi.shell6@gmail.com

Pedro Eduardo Dall Agnol            - GRR20240844 -         pedro.dallagnol.nr515@gmail.com

Thiago Yuuki Yamamura Sakuma        - GRR20244418 -        thiagoyys@gmail.com
