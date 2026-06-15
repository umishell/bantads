# Guia de Teste Manual Blackbox — BANTADS (2026)

Este guia foi elaborado para que você possa testar **manualmente** todas as funcionalidades do sistema BANTADS **apenas pela interface do usuário**, sem inspecionar bancos de dados, filas RabbitMQ ou logs de microsserviços.

Diferente do [guia whitebox](guia-teste-manual-whitebox.md), o **teste manual blackbox** trata o sistema como uma caixa-preta: você observa entradas (cliques, formulários) e saídas (telas, mensagens, redirecionamentos, e-mails no MailHog) e valida se o comportamento corresponde ao enunciado.

---

## O que é (e o que não é) teste blackbox


| Incluído neste guia                                         | Fora do escopo (use o guia whitebox)   |
| ----------------------------------------------------------- | -------------------------------------- |
| Telas, menus, botões e mensagens de sucesso/erro            | Queries SQL em PostgreSQL              |
| Formatação brasileira (moeda, CPF, telefone)                | Inspeção de coleções no MongoDB        |
| Redirecionamentos e bloqueio de rotas por perfil            | Filas e exchanges no RabbitMQ          |
| E-mails recebidos no MailHog (resultado visível ao usuário) | Logs do Docker (`docker compose logs`) |
| DevTools → aba **Network** (status HTTP, sem ler código)    | Validação de SAGA/CQRS nos bastidores  |


---

## Checklist para Defesa Final (visão do usuário)

Marque cada item executando **somente** pela interface em `http://localhost`:

### Requisitos Funcionais Obrigatórios

- [ ] **R01 - Autocadastro** (Seção 3 — R1)
- [ ] **R02 - Login/Logout** (Seção 3 — R2)
- [ ] **R03 - Tela inicial do cliente** (Seção 3 — R3)
- [ ] **R05 - Depósito** (Seção 3 — R5)
- [ ] **R09 - Tela inicial do gerente** (Seção 3 — R9)
- [ ] **R10 - Aprovar cliente** (Seção 3 — R10)
- [ ] **R15 - Tela inicial do administrador** (Seção 3 — R15)
- [ ] **R17 - Inserção de gerentes** (Seção 3 — R17)
- [ ] **R18 - Remoção de gerentes** (Seção 3 — R18)
- [ ] **R19 - Listagem de gerentes** (Seção 3 — R19)
- [ ] **R20 - Alteração de gerentes** (Seção 3 — R20)

### Requisitos Complementares (recomendados na apresentação)

- [ ] **R04 - Alteração de perfil** (Seção 3 — R4)
- [ ] **R06 - Saque** (Seção 3 — R6)
- [ ] **R07 - Transferência** (Seção 3 — R7)
- [ ] **R08 - Extrato** (Seção 3 — R8)
- [ ] **R11 - Rejeitar cliente** (Seção 3 — R11)
- [ ] **R12/R13 - Consulta de clientes do gerente** (Seção 3 — R12/R13)
- [ ] **R14 - Melhores clientes** (Seção 3 — R14)
- [ ] **R16 - Relatório de clientes (admin)** (Seção 3 — R16)

### Requisitos de Segurança e Integração (observáveis na UI)

- [ ] Cliente **não** acessa rotas de gerente ou admin (redireciona ou bloqueia)
- [ ] Após logout, rotas protegidas redirecionam para login
- [ ] Todas as requisições na aba Network usam `http://localhost/api/...` (nunca `:808x` nem `:4200/api`)
- [ ] Estados de loading e mensagens de erro aparecem em falhas de rede ou validação

---

## 1) Preparação do Ambiente

### 1.1) Subir a aplicação

Na raiz do projeto:

```bash
docker compose up --build -d
```

Aguarde todos os contêineres ficarem em execução:

```bash
docker compose ps
```

### 1.2) Resetar dados iniciais (seed)

Abra no navegador:

```
http://localhost/api/integration/reboot
```

**Resposta esperada:** JSON com `"profile": "full"` e status `200` para cada serviço.

Isso restaura os dados do enunciado (Catharyna, Cleuddônio, Catianna, Cutardo, Coândrya, gerentes e administrador).

### 1.3) Ferramentas necessárias


| Ferramenta            | URL                     | Uso no teste blackbox                                       |
| --------------------- | ----------------------- | ----------------------------------------------------------- |
| **Aplicação BANTADS** | `http://localhost`      | Interface principal — **sempre use a porta 80**             |
| **MailHog**           | `http://localhost:8025` | Verificar e-mails de aprovação/rejeição de cliente          |
| **DevTools (F12)**    | Aba **Network**         | Confirmar status HTTP (200, 400, 401, 403) sem abrir código |


> **Atenção:** Não use `http://localhost:4200`. O `ng serve` isolado não encaminha `/api/`* ao gateway e quebra chamadas HTTP.

### 1.4) Credenciais de teste (seed)


| Perfil            | E-mail                | Senha  | Observação                                |
| ----------------- | --------------------- | ------ | ----------------------------------------- |
| **Administrador** | `adm1@bantads.com.br` | `tads` | Dashboard e CRUD de gerentes              |
| **Gerente 1**     | `ger1@bantads.com.br` | `tads` | Geniéve — aprovação de clientes           |
| **Gerente 2**     | `ger2@bantads.com.br` | `tads` | Godophredo                                |
| **Gerente 3**     | `ger3@bantads.com.br` | `tads` | Gyândula                                  |
| **Cliente 1**     | `cli1@bantads.com.br` | `tads` | Catharyna — conta `1291`, saldo positivo  |
| **Cliente 2**     | `cli2@bantads.com.br` | `tads` | Cleuddônio — conta `0950`, saldo negativo |


### 1.5) Ordem recomendada dos testes

Alguns cenários dependem de outros. Siga esta sequência para evitar dados inconsistentes na interface:

```
R1 (autocadastro) → R2 (login) → R3 → R4 → R5 → R6 → R7 → R8
                              ↘ R9/R10 (aprovar R1) → login do novo cliente
R11 (rejeitar) — independente, pode rodar após R1
R12–R14 (gerente) — após reboot ou em paralelo
R15–R20 (admin) — R17 antes de R18; R20 por último (altera senha do ger1)
```

Se a interface ficar confusa após muitos testes, execute o reboot (seção 1.2) e recomece.

---

## 2) Mapa de Rotas (referência rápida)


| Perfil  | Rota                         | Função                          |
| ------- | ---------------------------- | ------------------------------- |
| Público | `/auth/login`                | Login                           |
| Público | `/auth/autocadastro`         | Solicitação de cadastro (R1)    |
| Cliente | `/cliente/home`              | Saldo e menu                    |
| Cliente | `/cliente/perfil`            | Alterar dados (R4)              |
| Cliente | `/cliente/deposito`          | Depósito (R5)                   |
| Cliente | `/cliente/saque`             | Saque (R6)                      |
| Cliente | `/cliente/transferencia`     | Transferência (R7)              |
| Cliente | `/cliente/extrato`           | Extrato (R8)                    |
| Gerente | `/gerente/home`              | Pendentes de aprovação (R9/R10) |
| Gerente | `/gerente/clientes`          | Carteira (R12)                  |
| Gerente | `/gerente/consulta`          | Detalhes de cliente (R13)       |
| Gerente | `/gerente/melhores-clientes` | Top 3 saldos (R14)              |
| Admin   | `/admin/home`                | Dashboard (R15)                 |
| Admin   | `/admin/relatorio-clientes`  | Relatório geral (R16)           |
| Admin   | `/admin/gerentes`            | CRUD de gerentes (R17–R20)      |


---

## 3) Roteiro de Testes Passo a Passo (R1 a R20)

Para cada cenário: execute a **Ação**, depois confira todos os itens em **Resultado esperado na interface**.

---

### R1: Autocadastro de Cliente (Público)

**Ação:**

1. Acesse `http://localhost` e clique em **"Quero ser Cliente"** (ou equivalente na tela de login).
2. Preencha o formulário:
  - **CPF:** `90238475042`
  - **Nome:** `Manual Test Cliente`
  - **E-mail:** `manual@test.com`
  - **Telefone:** `(41) 99999-9999`
  - **Salário:** `R$ 4.500,00`
  - **Endereço:** CEP `80000000`, Cidade `Curitiba`, Estado `PR`, Rua `Rua de Teste, 123`
3. Clique em **Enviar Solicitação**.

**Resultado esperado na interface:**

- [x] Mensagem de sucesso informando que a solicitação foi enviada e aguarda aprovação do gerente.
- [x] Indicador de loading durante o envio (se implementado).
- [ ] Na aba Network: requisição `POST /api/clientes` com status **200** ou **201**.
- [ ] Tentativa de login com `manual@test.com` **falha** (usuário ainda não tem senha).

**Teste negativo (opcional):**

- [ ] CPF inválido (ex.: `90238475023`) exibe erro de validação; Network retorna **400**.

---

### R2: Login e Logout (Todos os Perfis)

**Ação:**

1. Acesse `/auth/login`.
2. Faça login como administrador: `adm1@bantads.com.br` / `tads`.
3. Clique em **Sair (Logout)**.
4. Tente acessar diretamente `http://localhost/admin/home`.

**Resultado esperado na interface:**

- [ ] Login redireciona para `/admin/home` (dashboard do administrador).
- [ ] Nome ou perfil do usuário visível no cabeçalho/menu (se houver).
- [ ] Logout redireciona para a tela de login.
- [ ] Após logout, `/admin/home` redireciona para login (guard ativo).
- [ ] Na Network: `POST /api/auth/login` com **200**; chamadas subsequentes levam header `Authorization: Bearer ...`.

**Repita rapidamente** com `ger1@bantads.com.br` → `/gerente/home` e `cli1@bantads.com.br` → `/cliente/home`.

**Teste de ACL (blackbox):**

- [ ] Logado como **cliente**, tente acessar `http://localhost/admin/home` ou `http://localhost/gerente/home` — deve bloquear ou redirecionar.
- [ ] Logado como **gerente**, tente acessar `http://localhost/admin/home` — deve bloquear ou redirecionar.

---

### R3: Tela Inicial de Cliente (Saldo e Menu)

**Ação:**

1. Login: `cli1@bantads.com.br` / `tads` → observe `/cliente/home`.
2. Logout. Login: `cli2@bantads.com.br` / `tads` → observe `/cliente/home`.

**Resultado esperado na interface:**

- [ ] **Catharyna (cli1):** saldo `R$ 800,00` em cor neutra ou positiva (azul/verde).
- [ ] **Cleuddônio (cli2):** saldo `-R$ 10.000,00` em **vermelho** com sinal negativo.
- [ ] Menu com: Depositar, Sacar, Transferir, Extrato, Alterar Perfil.
- [ ] Formatação monetária brasileira (vírgula para centavos, prefixo `R$`).

---

### R4: Alteração de Perfil de Cliente

**Pré-condição:** logado como `cli1@bantads.com.br`.

**Ação:**

1. Acesse **Alterar Perfil** (`/cliente/perfil`).
2. Altere telefone para `(41) 98888-7777` e salário de `R$ 10.000,00` para `R$ 6.000,00`.
3. Salve.

**Resultado esperado na interface:**

- [ ] Mensagem de sucesso após salvar.
- [ ] Telefone e salário atualizados na tela de perfil.
- [ ] Na home, o **limite** da conta passa a ser `R$ 3.000,00` (metade do salário ≥ R$ 2.000,00).
- [ ] Na Network: `PUT /api/clientes/{cpf}` com **200**.

---

### R5: Depositar (Apenas na Própria Conta)

**Pré-condição:** logado como `cli1@bantads.com.br` (saldo inicial ~`R$ 800,00 `após reboot; ~`R$ 1.000,00` se já executou R4/R5 nesta sessão — anote o saldo antes).

**Ação:**

1. Acesse **Depositar** (`/cliente/deposito`).
2. Tente valor zero ou negativo — o formulário deve impedir ou exibir erro.
3. Deposite `R$ 200,00` e confirme.

**Resultado esperado na interface:**

- [ ] Mensagem de sucesso.
- [ ] Saldo na home aumenta exatamente `R$ 200,00` em relação ao valor anotado antes.
- [ ] Na Network: `POST` de depósito com **200**.

---

### R6: Sacar (Respeitando Saldo + Limite)

**Pré-condição:** logado como `cli1@bantads.com.br` após depósito do R5.

**Ação:**

1. Acesse **Sacar** (`/cliente/saque`).
2. Tente sacar `R$ 4.500,00` (acima do disponível: saldo + limite).
3. Saque válido de `R$ 1.500,00`.

**Resultado esperado na interface:**

- [ ] Saque acima do disponível: mensagem de **saldo insuficiente**; operação não concluída.
- [ ] Saque de `R$ 1.500,00`: sucesso.
- [ ] Novo saldo exibido como **negativo** (ex.: `-R$ 500,00`) em vermelho, se o saldo anterior era `R$ 1.000,00`.

---

### R7: Transferência (Entre Contas)

**Pré-condição:** logado como `cli1@bantads.com.br` (conta `1291`).

**Ação:**

1. Acesse **Transferir** (`/cliente/transferencia`).
2. Conta destino: `0950` (Cleuddônio). Valor: `R$ 300,00`.
3. Confirme.

**Resultado esperado na interface:**

- [ ] Mensagem de sucesso.
- [ ] Saldo de Catharyna diminui `R$ 300,00` em relação ao valor antes da transferência.
- [ ] Conta destino inválida (ex.: `0000`) exibe erro claro.

**Validação cruzada (blackbox):**

- [ ] Faça login como `cli2@bantads.com.br` e confira se o saldo de Cleuddônio **aumentou** `R$ 300,00`.

---

### R8: Consulta de Extrato (Filtro e Cores)

**Pré-condição:** logado como `cli1@bantads.com.br` após R5, R6 e R7.

**Ação:**

1. Acesse **Extrato** (`/cliente/extrato`).
2. Selecione período que inclua o dia de hoje.

**Resultado esperado na interface:**

- [ ] Lista as movimentações do dia:
  - Depósito `R$ 200,00` em **azul** (entrada).
  - Saque `R$ 1.500,00` em **vermelho** (saída).
  - Transferência `R$ 300,00` em **vermelho** (saída).
- [ ] Saldo consolidado ao final de cada dia (se exibido pelo layout).
- [ ] Período sem movimentações mostra lista vazia ou mensagem adequada.

---

### R9 e R10: Aprovação de Cliente (Gerente)

**Pré-condição:** autocadastro do R1 concluído (`Manual Test Cliente`).

**Ação:**

1. Login: `ger1@bantads.com.br` / `tads`.
2. Em `/gerente/home`, localize **Manual Test Cliente** na tabela de pendentes.
3. Clique em **Aprovar**.

**Resultado esperado na interface:**

- [ ] Cliente some da lista de pendentes após aprovação.
- [ ] Mensagem de sucesso.
- [ ] Indicador de processamento durante a aprovação (pode levar alguns segundos — é assíncrono).

**E-mail (MailHog):**

1. Abra `http://localhost:8025`.
2. Deve haver e-mail para `manual@test.com` com número da conta (4 dígitos) e **senha gerada**.

**Login do novo cliente:**

1. Logout do gerente.
2. Login: `manual@test.com` / **senha do e-mail**.

**Resultado esperado na interface:**

- [ ] Login bem-sucedido → `/cliente/home`.
- [ ] Saldo `R$ 0,00` e limite `R$ 2.250,00` (metade de R$ 4.500,00).

---

### R11: Rejeitar Cliente (Com Motivo)

**Ação:**

1. Novo autocadastro: CPF `11122233344`, e-mail `rejeitado@test.com`, demais campos válidos.
2. Login gerente: `ger1@bantads.com.br` / `tads`.
3. Em pendentes, clique **Recusar** em `rejeitado@test.com`.
4. Informe motivo: `Documentação de renda inconsistente`. Confirme.

**Resultado esperado na interface:**

- [ ] Cliente removido da lista de pendentes.
- [ ] Mensagem de sucesso.

**E-mail (MailHog):**

- [ ] E-mail para `rejeitado@test.com` contendo o motivo informado.

**Teste negativo:**

- [ ] Login com `rejeitado@test.com` continua impossível (sem credenciais).

---

### R12 e R13: Consultar Clientes do Gerente

**Pré-condição:** logado como `ger1@bantads.com.br`.

**Ação:**

1. Acesse **Meus Clientes** (`/gerente/clientes`).
2. Busque por `"Catharyna"` — depois pelo CPF `12912861012`.
3. Abra detalhes/consulta da Catharyna (`/gerente/consulta`).

**Resultado esperado na interface:**

- [ ] Tabela com: CPF, Nome, Cidade, Estado, Saldo, Limite.
- [ ] Ordenação **crescente por Nome**.
- [ ] Busca filtra corretamente por nome e por CPF.
- [ ] Tela de detalhes mostra endereço, telefone, salário, número da conta, saldo, limite e data de criação.

---

### R14: Consultar 3 Melhores Clientes

**Ação:**

1. Logado como gerente, acesse **Melhores Clientes** (`/gerente/melhores-clientes`).

**Resultado esperado na interface (após reboot, antes de movimentações):**

- [ ] Exatamente **3** clientes.
- [ ] Ordenados por saldo **decrescente**:
  1. Cutardo — `R$ 150.000,00`
  2. Coândrya — `R$ 1.500,00`
  3. Catharyna — ~`R$ 800,00` (ou saldo atual se já rodou R5–R7)

---

### R15: Tela Inicial do Administrador

**Ação:**

1. Login: `adm1@bantads.com.br` / `tads` → `/admin/home`.

**Resultado esperado na interface:**

- [ ] Lista/cards com os gerentes: Geniéve, Godophredo, Gyândula.
- [ ] Para cada gerente: quantidade de clientes, soma de saldos positivos, soma de saldos negativos (negativos com sinal `-`).
- [ ] Gerentes com **maiores saldos positivos** aparecem primeiro.

---

### R16: Relatório de Clientes (Administrador)

**Ação:**

1. Logado como admin, acesse **Relatório de Clientes** (`/admin/relatorio-clientes`).

**Resultado esperado na interface:**

- [ ] Tabela com todos os clientes: CPF, Nome, E-mail, Salário, Número da Conta, Saldo, Limite, CPF do Gerente, Nome do Gerente.
- [ ] Ordenação **crescente por nome do cliente**.
- [ ] Dados coerentes com o que o gerente vê na carteira (ex.: saldos de Catharyna batem com `/cliente/home`).

---

### R17: Inserção de Gerente (Com Remanejamento)

**Ação:**

1. Login admin → `/admin/gerentes` → **Novo Gerente**.
2. Preencha:
  - CPF: `11155566622`
  - Nome: `Novo Gerente Teste`
  - E-mail: `novogerente@bantads.com.br`
  - Telefone: `(41) 97777-6666`
  - Senha: `tads`
3. Salve.

**Resultado esperado na interface:**

- [ ] Novo gerente aparece na listagem.
- [ ] No dashboard (`/admin/home`), o novo gerente já consta com clientes remanejados (transferidos do gerente mais sobrecarregado).

**Validação cruzada (blackbox):**

- [ ] Login com `novogerente@bantads.com.br` / `tads` → `/gerente/home` funciona.

---

### R18: Remoção de Gerente (Com Remanejamento)

**Ação:**

1. Em `/admin/gerentes`, exclua **Novo Gerente Teste** (criado no R17).
2. Tente excluir gerentes até restar apenas um.

**Resultado esperado na interface:**

- [ ] Exclusão do gerente de teste: sucesso; some da listagem.
- [ ] Dashboard atualiza contagens dos gerentes remanescentes.
- [ ] Ao tentar excluir o **último** gerente: mensagem de erro; exclusão bloqueada.

---

### R19 e R20: Listagem e Alteração de Gerente

**Ação:**

1. Em `/admin/gerentes`, confira a listagem (Nome, CPF, E-mail, Telefone), ordenada por **Nome** crescente.
2. Edite **Geniéve** (`ger1@bantads.com.br`): nome → `Geniéve Alterada`, senha → `novasenha`. Salve.
3. Logout. Tente login gerente com senha antiga `tads` — depois com `novasenha`.

**Resultado esperado na interface:**

- [ ] Nome atualizado na listagem.
- [ ] Senha antiga: login **rejeitado** (mensagem de credenciais inválidas).
- [ ] Senha nova: login **aceito** → `/gerente/home`.

> **Nota:** Após R20, use `novasenha` para `ger1@bantads.com.br` nos demais testes, ou execute reboot para restaurar `tads`.

---

## 4) Testes de Usabilidade e Regressão Visual

Checklist rápido aplicável a qualquer tela:

- [ ] Campos obrigatórios vazios exibem validação antes do envio.
- [ ] Botões desabilitados ou spinner durante requisições longas (evita duplo clique).
- [ ] Mensagens de erro da API aparecem ao usuário (não ficam só no console).
- [ ] Layout responsivo mínimo: tabelas rolam horizontalmente em telas estreitas.
- [ ] Máscaras: CPF, telefone, CEP e moeda formatados corretamente.
- [ ] Links do menu destacam a rota ativa (se implementado).

---

## 5) Resolução de Problemas (visão blackbox)


| Sintoma na interface                                       | Causa provável                                     | O que fazer                                                                           |
| ---------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Erro `Http failure during parsing` com URL `:4200/api/...` | Frontend aberto na porta 4200                      | Use `http://localhost` (porta 80)                                                     |
| Login retorna 401 com credenciais corretas                 | Seed desatualizado ou Mongo indisponível           | Acesse `/api/integration/reboot` e tente novamente                                    |
| Autocadastro retorna 400 "CPF inválido"                    | CPF sem dígitos verificadores válidos              | Use `90238475042` ou gere CPF válido                                                  |
| Aprovação de cliente trava na tela                         | Processamento assíncrono lento ou falha no backend | Aguarde ~30s; se persistir, consulte o [guia whitebox](guia-teste-manual-whitebox.md) |
| E-mail não aparece no MailHog                              | Falha no fluxo de e-mail                           | Confirme que `http://localhost:8025` abre; recarregue a caixa de entrada              |
| Saldo na tela não bate com expectativa                     | Testes anteriores alteraram dados                  | Execute reboot e repita o cenário do zero                                             |
| 403 em qualquer operação                                   | Perfil sem permissão para a rota                   | Verifique login correto (CLIENTE/GERENTE/ADMIN)                                       |


---

## 6) Relação com outros guias


| Documento                                                                | Quando usar                                                                 |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| **Este guia (blackbox)**                                                 | Demonstração funcional, testes de aceitação, validação do enunciado pela UI |
| [guia-teste-manual-whitebox.md](guia-teste-manual-whitebox.md)           | Provar persistência em BD, SAGAs, RabbitMQ e CQRS na defesa técnica         |
| [guia-completo-testes-integracao.md](guia-completo-testes-integracao.md) | Suíte automatizada (`scripts/integration/`)                                 |
| [ROTAS_E_LOGINS.md](../frontend/src/app/features/ROTAS_E_LOGINS.md)      | Referência rápida de rotas no código                                        |


---

## 7) Registro de Execução (modelo)

Use esta tabela para documentar sua sessão de testes:


| ID  | Data | Testador | Cenário      | Resultado (OK/Falha) | Observação |
| --- | ---- | -------- | ------------ | -------------------- | ---------- |
| R1  |      |          | Autocadastro |                      |            |
| R2  |      |          | Login/Logout |                      |            |
| …   |      |          | …            |                      |            |


**Legenda:** OK = todos os itens da seção "Resultado esperado" passaram; Falha = descreva o comportamento observado e o status HTTP na aba Network.