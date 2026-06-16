# BANTADS

Projeto acadêmico desenvolvido para a disciplina **Desenvolvimento de Aplicações Corporativas (DAC)**, com foco em uma aplicação de Internet Banking estruturada em **frontend Angular**, **API Gateway** e **microsserviços Spring Boot/Kotlin**.

O sistema representa o banco fictício **BANTADS** e possui três perfis principais de acesso:

- **Cliente**
- **Gerente**
- **Administrador**

---

## Sumário

- [Sobre o projeto](#sobre-o-projeto)
- [Arquitetura geral](#arquitetura-geral)
- [Fluxo de comunicação](#fluxo-de-comunicação)
- [Tecnologias utilizadas](#tecnologias-utilizadas)
- [Estrutura do projeto](#estrutura-do-projeto)
  - [Raiz do repositório](#raiz-do-repositório)
  - [Frontend](#frontend)
  - [Gateway](#gateway)
  - [Microsserviços](#microsserviços)
  - [Scripts](#scripts)
  - [SQL](#sql)
  - [Relatórios de teste](#relatórios-de-teste)
- [Como executar o frontend isoladamente](#como-executar-o-frontend-isoladamente)
- [Como executar com Docker](#como-executar-com-docker)
- [Autores](#autores)

---

## Sobre o projeto

O BANTADS é uma aplicação bancária desenvolvida como trabalho da disciplina DAC. O objetivo é aplicar conceitos de aplicações corporativas, separação por camadas, autenticação, integração entre sistemas, mensageria e arquitetura baseada em microsserviços.

O projeto foi organizado para permitir evolução incremental. O frontend pode ser desenvolvido e testado isoladamente, enquanto o backend é dividido em serviços menores, cada um com uma responsabilidade específica.

---

## Arquitetura geral

A arquitetura do sistema segue a ideia de **microsserviços**. Em vez de existir apenas um backend único, o backend é dividido em vários serviços independentes.

A estrutura geral é:

```text
Frontend Angular
      |
      v
API Gateway Node.js
      |
      v
Microsserviços Spring Boot/Kotlin
      |
      v
Bancos de dados / RabbitMQ / serviços auxiliares
```

O **frontend** não deve acessar diretamente os microsserviços. Toda requisição HTTP feita pela interface deve passar primeiro pelo **API Gateway**.

O **Gateway** atua como ponto central de entrada. Ele recebe as chamadas do frontend, valida autenticação/perfil quando necessário e encaminha a requisição para o microsserviço responsável.

Os **microsserviços** concentram as regras de negócio. Cada um possui seus próprios controllers, services, DTOs, repositories, models e configurações.

---

## Fluxo de comunicação

Fluxo HTTP principal:

```text
Angular
  -> API Gateway
    -> ms-auth / ms-cliente / ms-conta / ms-gerente
      -> Banco de dados correspondente
```

Fluxo assíncrono com mensageria:

```text
Microsserviço de origem
  -> RabbitMQ
    -> ms-saga-orchestrator
      -> outros microsserviços envolvidos
```

O RabbitMQ é usado quando uma operação precisa envolver mais de um microsserviço, como aprovação de cliente, criação de conta, criação de usuário e envio de e-mail.

---

## Tecnologias utilizadas

### Frontend

- Angular
- TypeScript
- SCSS
- Angular Router
- Guards
- Interceptors
- Services

### Gateway

- Node.js
- Fastify
- Proxy HTTP
- Validação de JWT
- Controle de acesso por perfil

### Backend / Microsserviços

- Spring Boot
- Kotlin
- Spring Data JPA
- DTOs
- Repositories
- Services
- Controllers

### Infraestrutura

- PostgreSQL
- MongoDB
- RabbitMQ
- Docker
- Docker Compose
- MailHog

---

# Estrutura do projeto

Abaixo está a estrutura geral do repositório e a função de cada parte.

```text
bantads_pedro_
├── .github/
├── frontend/
├── gateway/
├── microservices/
├── scripts/
├── sql/
├── testReports/
└── README.md
```

---

## Raiz do repositório

A raiz concentra as principais pastas do sistema.

### `.github/`

Contém configurações relacionadas ao GitHub, como workflows de integração contínua.

Exemplo:

```text
.github/workflows/pr-ci.yml
```

Esse arquivo pode ser usado para validar builds, testes ou outras rotinas automatizadas em pull requests.

---

## Frontend

Pasta principal:

```text
frontend/
```

O frontend é a aplicação Angular acessada pelo usuário. Ele contém telas, rotas, services, models, guards, interceptors e componentes reutilizáveis.

Estrutura resumida:

```text
frontend/
├── public/
├── src/
│   ├── index.html
│   ├── main.ts
│   ├── styles.scss
│   └── app/
│       ├── core/
│       ├── features/
│       └── shared/
├── angular.json
├── package.json
├── package-lock.json
├── Dockerfile
└── nginx.conf
```

### `frontend/public/`

Contém arquivos públicos e estáticos da aplicação.

Exemplo:

```text
favicon.ico
```

### `frontend/src/`

Contém o código-fonte principal do Angular.

### `frontend/src/main.ts`

Arquivo de inicialização da aplicação Angular. Ele carrega a aplicação principal no navegador.

### `frontend/src/styles.scss`

Arquivo global de estilos. Regras colocadas aqui podem afetar toda a aplicação.

### `frontend/src/app/`

Contém a aplicação Angular propriamente dita.

---

## `frontend/src/app/core/`

A pasta `core` guarda recursos centrais da aplicação, usados de forma global.

```text
core/
├── config/
├── guards/
├── interceptors/
└── services/
```

### `core/config/`

Guarda configurações globais do frontend, como base da API.

Exemplo:

```text
api-base.ts
```

Essa configuração ajuda os services a saberem para onde enviar requisições HTTP.

### `core/guards/`

Guarda os guards de rota.

Exemplos:

```text
auth.guard.ts
role.guard.ts
```

O `auth.guard.ts` protege rotas que exigem login.

O `role.guard.ts` protege rotas por perfil, como Cliente, Gerente ou Administrador.

### `core/interceptors/`

Guarda interceptors HTTP.

Exemplo:

```text
auth.interceptor.ts
```

O interceptor pode anexar automaticamente o token JWT no header das requisições:

```text
Authorization: Bearer <token>
```

### `core/services/`

Guarda services globais.

Exemplo:

```text
auth.service.ts
```

O `AuthService` controla login, logout, sessão do usuário e dados do usuário logado.

---

## `frontend/src/app/features/`

A pasta `features` contém as funcionalidades principais da aplicação separadas por domínio/tipo de usuário.

```text
features/
├── admin/
├── auth/
├── cliente/
└── gerente/
```

Essa separação facilita a manutenção, pois cada área do sistema fica isolada.

---

## `features/auth/`

Contém telas públicas relacionadas à autenticação e entrada no sistema.

```text
auth/
├── auth.routes.ts
├── auth-shared.scss
├── autocadastro/
└── login/
```

### `auth.routes.ts`

Define as rotas da área de autenticação.

Exemplos:

```text
/auth/login
/auth/autocadastro
```

### `login/`

Contém a tela de login.

```text
login.component.html
login.component.scss
login.component.ts
```

- `.html`: estrutura visual da tela.
- `.scss`: estilos da tela.
- `.ts`: lógica do componente, formulário e chamada ao AuthService.

### `autocadastro/`

Contém a tela de autocadastro do cliente.

```text
autocadastro.component.html
autocadastro.component.scss
autocadastro.component.ts
```

Essa tela permite que uma pessoa solicite cadastro no BANTADS sem estar logada.

---

## `features/cliente/`

Contém as páginas disponíveis para usuários com perfil Cliente.

```text
cliente/
├── cliente.routes.ts
└── pages/
    ├── home/
    ├── perfil/
    ├── deposito/
    ├── saque/
    ├── transferencia/
    └── extrato/
```

### `cliente.routes.ts`

Define as rotas internas da área do cliente.

### `home/`

Tela inicial do cliente. Exibe informações principais, como saldo e dados resumidos da conta.

### `perfil/`

Tela de alteração/consulta dos dados do cliente.

### `deposito/`

Tela para realizar depósito na própria conta.

### `saque/`

Tela para realizar saque, respeitando saldo e limite.

### `transferencia/`

Tela para transferir valores para outra conta.

### `extrato/`

Tela para consultar movimentações da conta por período.

---

## `features/gerente/`

Contém as páginas disponíveis para usuários com perfil Gerente.

```text
gerente/
├── gerente.routes.ts
└── pages/
    ├── home/
    ├── clientes/
    ├── consulta/
    └── melhores-clientes/
```

### `home/`

Tela inicial do gerente. Deve apresentar solicitações de autocadastro pendentes de aprovação.

### `clientes/`

Lista clientes vinculados ao gerente.

### `consulta/`

Permite consultar um cliente específico.

### `melhores-clientes/`

Exibe os clientes com maiores saldos.

---

## `features/admin/`

Contém as páginas disponíveis para usuários com perfil Administrador.

```text
admin/
├── admin.routes.ts
└── pages/
    ├── home/
    ├── gerentes/
    └── relatorio-clientes/
```

### `home/`

Dashboard administrativo com visão geral dos gerentes e saldos.

### `gerentes/`

Tela de CRUD de gerentes: cadastro, alteração, listagem e remoção.

### `relatorio-clientes/`

Relatório geral com dados de clientes, contas e gerentes.

---

## `frontend/src/app/shared/`

A pasta `shared` guarda recursos compartilhados por várias áreas do frontend.

```text
shared/
├── components/
├── models/
├── services/
├── utils/
└── validators/
```

### `shared/components/`

Componentes reutilizáveis.

Exemplo:

```text
processando-button/
```

Esse tipo de componente evita repetição de código visual.

### `shared/models/`

Interfaces e tipos TypeScript usados para padronizar dados no frontend.

```text
models/
├── admin/
├── api/
├── auth/
├── cliente/
├── conta/
└── gerente/
```

Esses arquivos representam o formato dos dados usados pela aplicação.

### `shared/services/`

Services responsáveis por comunicação HTTP e regras de acesso a dados no frontend.

Exemplos:

```text
admin.service.ts
cliente.service.ts
conta.service.ts
gerente.service.ts
viacep.service.ts
```

Esses services são o ponto de contato entre o frontend e o Gateway.

### `shared/utils/`

Funções auxiliares para máscaras, tratamento de campos e formatação.

### `shared/validators/`

Validadores reutilizáveis para formulários.

---

# Gateway

Pasta principal:

```text
gateway/
```

O Gateway é a entrada única da aplicação backend. Ele recebe chamadas do frontend e encaminha para o microsserviço correto.

Estrutura resumida:

```text
gateway/
├── Dockerfile
├── package.json
├── package-lock.json
└── src/
    ├── app.js
    ├── jwt.js
    ├── public-routes.js
    ├── admin-routes.js
    ├── cliente-routes.js
    ├── gerente-routes.js
    ├── conta-routes.js
    ├── conta-cliente-guard.js
    └── integration-reboot.js
```

### `gateway/src/app.js`

Arquivo principal do Gateway. Inicializa o servidor, registra rotas, configura proxies e aplica validações.

### `jwt.js`

Responsável por validar tokens JWT recebidos nas requisições.

### `public-routes.js`

Define quais rotas podem ser acessadas sem autenticação, como login e autocadastro.

### `admin-routes.js`

Define regras de acesso para rotas de administrador.

### `gerente-routes.js`

Define regras de acesso para rotas de gerente.

### `cliente-routes.js`

Define regras de acesso para rotas de cliente.

### `conta-routes.js`

Agrupa regras ou rotas relacionadas às operações de conta.

### `conta-cliente-guard.js`

Ajuda a validar se uma operação de conta pertence ao cliente correto, evitando acesso indevido a contas de terceiros.

### `integration-reboot.js`

Apoia rotinas de reinicialização/seed para testes integrados.

---

# Microsserviços

Pasta principal:

```text
microservices/
```

Cada pasta dentro de `microservices` representa um backend independente.

```text
microservices/
├── ms-auth/
├── ms-cliente/
├── ms-conta/
├── ms-email/
├── ms-gerente/
└── ms-saga-orchestrator/
```

Cada microsserviço possui estrutura semelhante:

```text
src/main/kotlin/bantads/<dominio>/
├── config/
├── controller/
├── dto/
├── exception/
├── integration/
├── messaging/
├── model/
├── repository/
├── service/
└── util/
```

Nem todo microsserviço possui todas essas pastas. Cada uma existe conforme a necessidade do serviço.

---

## Estrutura comum de um microsserviço

### `config/`

Configurações do Spring Boot, RabbitMQ, Swagger/OpenAPI, segurança, Jackson e seeds de desenvolvimento.

### `controller/`

Camada que recebe requisições HTTP.

Exemplo:

```text
ClienteController.kt
GerenteController.kt
AuthController.kt
```

Os controllers expõem endpoints para o Gateway.

### `dto/`

DTO significa **Data Transfer Object**.

DTOs são classes usadas para entrada e saída de dados da API. Eles evitam que entidades do banco sejam expostas diretamente.

Exemplos:

```text
LoginRequest.kt
AutocadastroRequest.kt
ContaDtos.kt
GerenteDtos.kt
```

### `exception/`

Classes de exceção específicas do domínio.

Exemplo:

```text
CpfJaCadastradoException.kt
ContaExceptions.kt
GerenteExceptions.kt
```

### `integration/`

Clientes HTTP internos usados quando um serviço precisa consultar outro serviço de forma síncrona, geralmente através do Gateway ou de uma URL interna configurada.

### `messaging/`

Classes relacionadas à mensageria com RabbitMQ.

Aqui ficam listeners, publishers e classes responsáveis por enviar ou receber comandos e eventos assíncronos.

### `model/`

Entidades de domínio/persistência.

Normalmente representam tabelas no banco relacional ou documentos no MongoDB.

### `repository/`

Interfaces do Spring Data usadas para acessar o banco de dados.

### `service/`

Camada de regras de negócio.

Os services recebem dados dos controllers, aplicam regras, chamam repositories e publicam eventos quando necessário.

### `util/`

Funções auxiliares, como validação de CPF, máscaras ou normalização de dados.

---

## `ms-auth`

Responsável por autenticação e usuários do sistema.

Principais responsabilidades:

- Login
- Logout
- Geração e validação de JWT
- Hash de senha
- Salt de senha
- Persistência de usuários no MongoDB
- Criação de usuários para clientes, gerentes e administrador

Conversa com:

```text
Frontend -> Gateway -> ms-auth
ms-saga-orchestrator -> ms-auth
ms-auth -> MongoDB
```

---

## `ms-cliente`

Responsável pelos dados dos clientes e pelo início do fluxo de autocadastro/aprovação.

Principais responsabilidades:

- Autocadastro
- Consulta de cliente
- Alteração de perfil
- Listagem de clientes pendentes
- Aprovação/rejeição de clientes
- Publicação de eventos para a SAGA
- Persistência de dados do cliente no PostgreSQL

Conversa com:

```text
Frontend -> Gateway -> ms-cliente
ms-cliente -> PostgreSQL
ms-cliente -> RabbitMQ
ms-saga-orchestrator -> ms-cliente
```

---

## `ms-conta`

Responsável por contas bancárias e movimentações.

Principais responsabilidades:

- Consulta de saldo
- Depósito
- Saque
- Transferência
- Extrato
- Criação de conta após aprovação de cliente
- Cálculo e atualização de limite
- Dados agregados para gerente/administrador
- CQRS no domínio de conta

Conversa com:

```text
Frontend -> Gateway -> ms-conta
ms-conta -> PostgreSQL
ms-conta -> RabbitMQ
ms-saga-orchestrator -> ms-conta
```

---

## `ms-gerente`

Responsável pelos gerentes e funcionalidades administrativas relacionadas a eles.

Principais responsabilidades:

- Listagem de gerentes
- Cadastro de gerente
- Alteração de gerente
- Remoção de gerente
- Dashboard do administrador
- Apoio à escolha de gerente em fluxos de negócio
- Regras de redistribuição de contas em inserção/remoção de gerente

Conversa com:

```text
Frontend -> Gateway -> ms-gerente
ms-gerente -> PostgreSQL
ms-gerente -> RabbitMQ
ms-saga-orchestrator -> ms-gerente
```

---

## `ms-email`

Responsável pelo envio de e-mails.

Principais responsabilidades:

- Enviar e-mail de aprovação de cliente
- Enviar e-mail de rejeição de cliente
- Enviar credenciais temporárias quando necessário
- Responder à SAGA após tentativa de envio

Conversa com:

```text
ms-saga-orchestrator -> RabbitMQ -> ms-email
ms-email -> MailHog em ambiente de desenvolvimento
```

---

## `ms-saga-orchestrator`

Responsável por coordenar operações distribuídas entre vários microsserviços.

Principais responsabilidades:

- Orquestrar fluxo de aprovação de cliente
- Enviar comandos para outros microsserviços
- Receber respostas assíncronas
- Decidir próximo passo da transação
- Executar compensações em caso de falha

Conversa com:

```text
RabbitMQ -> ms-saga-orchestrator -> RabbitMQ
```

Esse serviço é importante porque evita que um microsserviço precise conhecer toda a lógica de uma operação distribuída.

---

# Scripts

Pasta principal:

```text
scripts/
```

Guarda scripts de apoio ao desenvolvimento, build, testes e execução.

Estrutura resumida:

```text
scripts/
├── docker-compose-build-one-by-one.ps1
├── run-integration-tests.ps1
├── run-integration-tests.sh
└── integration/
```

### `docker-compose-build-one-by-one.ps1`

Script auxiliar para buildar serviços Docker individualmente.

### `run-integration-tests.ps1` e `run-integration-tests.sh`

Scripts para execução de testes de integração.

### `scripts/integration/`

Contém testes e bibliotecas auxiliares usados para validar fluxos do sistema.

```text
integration/
├── lib/
└── tests/
```

A pasta `lib` concentra funções auxiliares dos testes.

A pasta `tests` contém os cenários de teste.

---

# SQL

Pasta principal:

```text
sql/
```

Contém scripts SQL relacionados ao banco de dados.

```text
sql/
├── 01_bantads_schema.sql
├── 02_bantads_logic_triggers.sql
└── 03_bantads_mock_data.sql
```

Esses arquivos servem como apoio para criação, documentação ou inicialização da base, conforme a etapa de desenvolvimento. Caso o projeto utilize seeds automáticas nos microsserviços, os scripts SQL devem continuar alinhados com a modelagem final para entrega.

---

# Relatórios de teste

Pasta principal:

```text
testReports/
```

Guarda relatórios ou documentação relacionada a execuções de testes.

---

# Como executar o frontend isoladamente

Entre na pasta do frontend:

```bash
cd frontend
```

Instale as dependências:

```bash
npm install
```

Execute:

```bash
npm start
```

Acesse:

```text
http://localhost:4200
```

---

# Como executar com Docker

A execução completa com Docker depende da configuração final dos serviços e do `docker-compose`.

De forma geral, a execução completa envolve:

```bash
docker compose up --build
```

Esse comando deve subir:

- Frontend
- Gateway
- Microsserviços
- PostgreSQL
- MongoDB
- RabbitMQ
- MailHog

---

# Boas Práticas e Padrões Arquiteturais Utilizados

Durante o desenvolvimento do BANTADS foram adotadas diversas práticas voltadas para organização, manutenção e escalabilidade do sistema.

## Separação de Responsabilidades

O projeto segue o princípio de responsabilidade única (Single Responsibility Principle), onde cada camada possui uma função específica.

### Frontend

No frontend Angular, as responsabilidades foram divididas entre:

- Components
- Services
- Guards
- Interceptors
- Models
- Validators

Essa organização reduz o acoplamento entre funcionalidades e facilita futuras manutenções.

### Gateway

O Gateway atua exclusivamente como ponto de entrada da aplicação.

Entre suas responsabilidades estão:

- Receber requisições do frontend;
- Validar autenticação;
- Verificar permissões de acesso;
- Encaminhar chamadas para os microsserviços corretos.

As regras de negócio não devem ficar concentradas no Gateway.

### Microsserviços

Cada microsserviço possui um domínio específico.

Exemplos:

- ms-auth → autenticação;
- ms-cliente → clientes;
- ms-conta → contas bancárias;
- ms-gerente → gerentes;
- ms-email → envio de e-mails.

Essa divisão reduz dependências e melhora a escalabilidade do sistema.

---

## Uso de DTOs

Os microsserviços utilizam DTOs (Data Transfer Objects) para entrada e saída de dados.

Benefícios:

- Evita exposição direta das entidades do banco;
- Facilita validações;
- Melhora a segurança da API;
- Permite evolução independente dos modelos internos.

---

## Arquitetura Baseada em Eventos

Operações que envolvem múltiplos serviços utilizam comunicação assíncrona através do RabbitMQ.

Essa abordagem oferece:

- Menor acoplamento;
- Maior escalabilidade;
- Melhor tolerância a falhas;
- Processamento distribuído.

---

## Padrão Saga

O microsserviço ms-saga-orchestrator implementa o padrão Saga para coordenação de transações distribuídas.

Esse padrão permite:

- Executar processos complexos envolvendo vários serviços;
- Detectar falhas durante a execução;
- Realizar compensações quando necessário;
- Garantir consistência entre os dados.

---

## Segurança

A autenticação do sistema é baseada em JWT (JSON Web Token).

Os tokens são utilizados para:

- Identificação do usuário;
- Controle de sessão;
- Controle de acesso por perfil;
- Proteção de rotas privadas.

Além disso, Guards e Interceptors são utilizados no frontend para reforçar a segurança da navegação.

---

## Escalabilidade

A arquitetura baseada em microsserviços permite que cada componente seja escalado de forma independente.

Por exemplo:

- Aumento de instâncias do ms-conta em períodos de alta movimentação;
- Escalabilidade do ms-email para envio massivo de notificações;
- Expansão do Gateway sem alterar os demais serviços.

Essa característica facilita a evolução futura do sistema.

---

# Autores

Gabriela Harres Rodrigues - GRR20246215 - gabrielahrodrigus101@gmail.com

Michel Abril Marinho - GRR20223411 - umi.shell6@gmail.com

Pedro Eduardo Dall Agnol - GRR20240844 - pedro.dallagnol.nr515@gmail.com
