# Guia de Teste Manual Whitebox — BANTADS (2026)

Este guia foi elaborado para que você possa testar **manualmente** todas as funcionalidades e transações do sistema BANTADS, cobrindo desde a interface do usuário (Frontend Angular) até os bastidores do sistema (bancos de dados PostgreSQL/MongoDB, mensageria RabbitMQ, e-mails no MailHog e logs de microsserviços).

Diferente de um teste funcional comum (blackbox), o **teste manual whitebox** exige que você valide se os dados foram persistidos corretamente nos bancos de dados isolados, se as mensagens trafegaram pelas filas corretas do RabbitMQ e se as transações distribuídas (SAGAs) e a sincronização CQRS ocorreram conforme o esperado.

---

## Checklist para Defesa Final

Utilize este checklist interativo para verificar se o seu projeto atende a todas as exigências obrigatórias do professor antes de iniciar a apresentação:

### Requisitos Arquiteturais e de Infraestrutura
- [ ] **APP de Teste Rodando?**
  * *Como provar:* A suíte de testes de integração automatizados que vive em `scripts/integration/` pode ser executada por `.\scripts\run-integration-tests.ps1` (Windows) ou `./scripts/run-integration-tests.sh` (Linux/macOS). Ela dispara requisições reais contra o API Gateway e valida todos os fluxos. Além disso, se o professor executar a aplicação oficial de testes (`test_dac`), ela rodará perfeitamente contra a porta 80 do seu Gateway.
- [ ] **Front-end em Angular/Vue/React?**
  * *Como provar:* O projeto está implementado em **Angular 20** com TypeScript e arquitetura moderna de Standalone Components (sem NgModules).
- [ ] **Interface bem elaborada?**
  * *Como provar:* O frontend utiliza estilos modernos com Bootstrap/Material, possuindo controle de estados (loading, erro, sucesso), máscaras de formatação brasileira e cores semânticas (saldos e saídas de extrato em vermelho, depósitos e entradas em azul).
- [ ] **Back-end em Spring Boot - Java/Kotlin?**
  * *Como provar:* O back-end é desenvolvido em **Kotlin** com **Spring Boot 4** e JVM 24.
- [ ] **Back-end usando Microsserviços?**
  * *Como provar:* O sistema é composto por microsserviços independentes e especializados: `ms-auth`, `ms-cliente`, `ms-conta`, `ms-gerente`, `ms-saga-orchestrator` e `ms-email`.
- [ ] **Front-end acessando o back-end via API Gateway?**
  * *Como provar:* O frontend consome exclusivamente a URL `http://localhost/api/...` (porta 80). Não há chamadas diretas às portas `808x` dos microsserviços no código do Angular.
- [ ] **API Gateway básico implementado?**
  * *Como provar:* O gateway está implementado em **Fastify 5** (Node.js 22), centralizando o roteamento, validando tokens JWT e aplicando as regras de ACL (como o `conta-cliente-guard.js` que impede que um cliente acesse dados de conta alheia).
- [ ] **Front-end integrado ao Back-end?**
  * *Como provar:* Todas as telas realizam requisições HTTP reais para o gateway e renderizam os dados vindos do back-end em tempo real.
- [ ] **Não usa Local Storage nem JSON-Server para dados?**
  * *Como provar:* Todas as informações de negócio são persistidas de forma robusta e real nos bancos de dados PostgreSQL e MongoDB. O `sessionStorage` é usado apenas para manter o token JWT da sessão ativa.
- [ ] **PostgreSQL e MongoDB (somente no MS Auth)?**
  * *Como provar:* O `ms-auth` utiliza **MongoDB 7** para armazenar as credenciais e perfis. Todos os demais microsserviços utilizam **PostgreSQL 16** para dados transacionais.
- [ ] **Bancos de Dados distintos para cada MS?**
  * *Como provar:* O projeto implementa o padrão *Database-per-Service*. No `docker-compose.yml`, cada serviço possui sua própria instância de banco de dados isolada em portas externas distintas (`5433` para cliente, `5434` para conta, `5435` para gerente e `27017` para auth).
- [ ] **Ao menos uma SAGA completamente implementada?**
  * *Como provar:* O sistema possui **4 SAGAs orquestradas** completas: Autocadastro (R01/R10), Alteração de Perfil (R04), Inserção de Gerente (R17) e Remoção de Gerente (R18).
- [ ] **RabbitMQ para comunicação entre MS?**
  * *Como provar:* O RabbitMQ é o broker de mensageria oficial do sistema. Toda a comunicação entre o orquestrador de SAGA e os microsserviços ocorre de forma assíncrona através de filas e exchanges configuradas no RabbitMQ.

### Requisitos Funcionais Obrigatórios
- [ ] **R01 - Autocadastro?** (Coberto na Seção 3 - R1)
- [ ] **R02 - Login/Logout?** (Coberto na Seção 3 - R2)
- [ ] **R03 - Tela inicial do cliente?** (Coberto na Seção 3 - R3)
- [ ] **R05 - Depósito?** (Coberto na Seção 3 - R5)
- [ ] **R09 - Tela inicial do Gerente?** (Coberto na Seção 3 - R9)
- [ ] **R10 - Aprovar Cliente?** (Coberto na Seção 3 - R10)
- [ ] **R15 - Tela inicial do Administrador?** (Coberto na Seção 3 - R15)
- [ ] **R17 - Inserção de Gerentes?** (Coberto na Seção 3 - R17)
- [ ] **R18 - Remoção de Gerentes?** (Coberto na Seção 3 - R18)
- [ ] **R19 - Listagem de Gerentes?** (Coberto na Seção 3 - R19)
- [ ] **R20 - Alteração de Gerentes?** (Coberto na Seção 3 - R20)

---

## 1) Preparação do Ambiente de Teste

Antes de iniciar os testes, certifique-se de que a stack Docker está de pé e limpa.

### 1.1) Subir a Stack Docker
Na raiz do projeto (onde está o arquivo `docker-compose.yml`), execute o comando abaixo para compilar e subir todos os contêineres:

```bash
docker compose up --build -d
```

Verifique se todos os contêineres estão em execução (`running`):

```bash
docker compose ps
```

### 1.2) Resetar o Banco de Dados (Reboot Completo)
Para garantir que você está testando com os dados seed exatos do enunciado (PDF), faça uma requisição HTTP do tipo `GET` para o endpoint de reboot do gateway. Você pode fazer isso abrindo o navegador e acessando:

```
http://localhost/api/integration/reboot
```

**Resposta esperada (HTTP 200):**
```json
{
  "profile": "full",
  "results": [
    { "service": "ms-gerente", "status": 200 },
    { "service": "ms-cliente", "status": 200 },
    { "service": "ms-conta", "status": 200 },
    { "service": "ms-auth", "status": 200 }
  ]
}
```
*Esse comando limpa todos os bancos de dados PostgreSQL e MongoDB e insere os dados iniciais do enunciado (Catharyna, Cleuddônio, Catianna, Cutardo, Coândrya, gerentes e administrador).*

---

## 2) Painel de Controle das Ferramentas de Inspeção (Whitebox)

Mantenha as seguintes ferramentas e conexões abertas em sua máquina para realizar as verificações:

| Ferramenta / Serviço | Endereço / URL | Credenciais / Configuração |
| :--- | :--- | :--- |
| **Frontend Angular** | `http://localhost` (porta 80, via gateway) | Interface gráfica do usuário. **Não** use `:4200` direto — ver seção 5. |
| **RabbitMQ Management** | `http://localhost:15672` | Usuário: `guest` \| Senha: `guest` |
| **MailHog (E-mails)** | `http://localhost:8025` | Caixa de entrada de e-mails do sistema |
| **Banco ms-cliente (PG)** | `localhost:5433` | Banco: `cliente_db` \| User: `user` \| Senha: `password` |
| **Banco ms-conta (PG)** | `localhost:5434` | Banco: `conta_db` \| User: `user` \| Senha: `password` |
| **Banco ms-gerente (PG)** | `localhost:5435` | Banco: `gerente_db` \| User: `user` \| Senha: `password` |
| **Banco ms-auth (MongoDB)** | `localhost:27017` | Banco: `auth_db` \| Coleção: `usuarios` |

---

## 3) Roteiro de Testes Passo a Passo (Requisitos R1 a R20)

### R1: Autocadastro de Cliente (Público)
*Uma pessoa solicita abertura de conta na página inicial. A operação é assíncrona.*

1. **Ação no Frontend:**
   - Acesse **`http://localhost`** (gateway na porta 80) e clique em **"Quero ser Cliente"** (ou Registrar-se).
   - Preencha o formulário com dados válidos:
     - **CPF:** `90238475042` (CPF com dígitos verificadores válidos; não use `90238475023`, que o backend rejeita)
     - **Nome:** `Manual Test Cliente`
     - **E-mail:** `manual@test.com`
     - **Telefone:** `(41) 99999-9999`
     - **Salário:** `4500.00` (ou `R$ 4.500,00` conforme a máscara do campo)
     - **Dados de Endereço:** CEP `80000000`, Cidade `Curitiba`, Estado `PR`, Rua `Rua de Teste, 123`.
   - Clique em **Enviar Solicitação**.

2. **Verificação Blackbox (Interface):**
   - Deve exibir uma mensagem clara indicando que a solicitação foi enviada com sucesso e que o cadastro passará por aprovação do gerente.
   - O usuário **não** deve conseguir fazer login ainda (pois não possui senha e a conta não foi criada).

3. **Verificação Whitebox (Banco de Dados):**
   - Conecte-se ao banco `cliente_db` (`localhost:5433`) e execute a query:
     ```sql
     SELECT id, nome, cpf, email, status, salario FROM cliente WHERE cpf = '90238475042';
     ```
   - **Resultado Esperado:** O registro deve existir com o status de `PENDENTE_APROVACAO`.
   - Conecte-se ao banco `conta_db` (`localhost:5434`) e ao MongoDB `auth_db` (`localhost:27017`).
   - **Resultado Esperado:** **NÃO** deve existir nenhuma conta ou usuário para este CPF ainda.

4. **Verificação Whitebox (Mensageria & Logs):**
   - Acesse o painel do RabbitMQ (`http://localhost:15672`).
   - Verifique se houve tráfego na exchange `bantads.saga` com a routing key `evt.cliente.pendente.criado`.
   - Abra o terminal e inspecione os logs do microsserviço de SAGA:
     ```bash
     docker compose logs ms-saga --tail=50
     ```
   - Você deve ver uma linha indicando que a SAGA recebeu o evento de cadastro pendente:
     `Saga recebeu cadastro pendente sagaId=... clienteId=...`

---

### R2: Login e Logout (Todos os Perfis)
*Garantir que a autenticação via JWT Bearer está funcionando e que tokens inválidos ou revogados são bloqueados.*

1. **Ação no Frontend:**
   - Acesse a tela de login.
   - Faça login como Administrador:
     - **E-mail:** `adm1@bantads.com.br` \| **Senha:** `tads`
   - Clique em **Sair (Logout)**.

2. **Verificação Blackbox (Interface):**
   - O login deve redirecionar para a tela inicial do Administrador (Dashboard).
   - O logout deve limpar a sessão e redirecionar de volta para a tela de login.
   - Tente acessar diretamente a URL `http://localhost/admin` após o logout. O sistema deve bloquear o acesso e redirecionar para o login (Guards do Angular ativos).

3. **Verificação Whitebox (Banco de Dados & Logs):**
   - Abra o console do MongoDB (`localhost:27017`) na base `auth_db` e verifique a coleção `usuarios`:
     ```javascript
     db.usuarios.find({ email: "adm1@bantads.com.br" })
     ```
   - **Resultado Esperado:** O usuário deve possuir o campo `tipo` igual a `ADMIN`.
   - Inspecione os logs do `ms-auth`:
     ```bash
     docker compose logs ms-auth --tail=50
     ```
   - Você verá a autenticação com sucesso e a geração do token JWT assinado com a chave SHA-512.

---

### R3: Tela Inicial de Cliente (Saldo e Menu)
*Apresentar o saldo atual do cliente de forma destacada, com formatação brasileira e sinal de negativo em vermelho caso esteja devedor.*

1. **Ação no Frontend:**
   - Faça login com o cliente de saldo positivo: `cli1@bantads.com.br` / `tads`.
   - Observe a tela inicial.
   - Faça logout e faça login com o cliente de saldo negativo: `cli2@bantads.com.br` / `tads`.
   - Observe a tela inicial.

2. **Verificação Blackbox (Interface):**
   - Para o **Cliente 1 (Catharyna)**: O saldo deve ser exibido como `R$ 800,00` em cor padrão (ou azul/verde).
   - Para o **Cliente 2 (Cleuddônio)**: O saldo deve ser exibido como `-R$ 10.000,00` destacado em **vermelho** e com o sinal de menos `-`.
   - O menu lateral ou superior deve exibir as opções: Depositar, Sacar, Transferir, Extrato e Alterar Perfil.

3. **Verificação Whitebox (Banco de Dados):**
   - Conecte-se ao banco `conta_db` (`localhost:5434`) e execute:
     ```sql
     SELECT numero, saldo, limite FROM conta WHERE numero IN ('1291', '0950');
     ```
   - **Resultado Esperado:** Os saldos e limites exibidos na tela devem bater exatamente com as colunas `saldo` e `limite` do banco de dados PostgreSQL.

---

### R4: Alteração de Perfil de Cliente (SAGA)
*O cliente altera seus dados de perfil. Se o salário mudar, o limite da conta deve ser recalculado e ajustado.*

1. **Ação no Frontend:**
   - Logado como `cli1@bantads.com.br` (Catharyna), acesse **"Alterar Perfil"**.
   - Altere o telefone para `(41) 98888-7777` e o salário de `R$ 10.000,00` para `R$ 6.000,00`.
   - Clique em **Salvar Alterações**.

2. **Verificação Blackbox (Interface):**
   - O sistema deve processar a alteração e exibir os novos dados de perfil atualizados.
   - O limite da conta deve ter sido atualizado para `R$ 3.000,00` (metade do novo salário de R$ 6.000,00, pois é maior ou igual a R$ 2.000,00).

3. **Verificação Whitebox (Banco de Dados):**
   - No banco `cliente_db` (`localhost:5433`), verifique se os dados cadastrais mudaram:
     ```sql
     SELECT nome, telefone, salario FROM cliente WHERE email = 'cli1@bantads.com.br';
     ```
   - No banco `conta_db` (`localhost:5434`), verifique se o limite foi atualizado:
     ```sql
     SELECT numero, saldo, limite FROM conta WHERE numero = '1291';
     ```
     *(O limite deve ser exatamente `3000.00`)*.

4. **Verificação Whitebox (Mensageria & Logs):**
   - A alteração de perfil dispara uma **SAGA** entre `ms-cliente` e `ms-conta` via RabbitMQ para atualizar o limite de forma consistente.
   - Verifique os logs do `ms-saga`:
     ```bash
     docker compose logs ms-saga --tail=50
     ```
   - Você verá o fluxo de atualização de perfil passando pelos passos de alteração no cliente e atualização de limite na conta.

---

### R5: Depositar (Apenas na Própria Conta)
*O cliente deposita um valor na sua conta bancária.*

1. **Ação no Frontend:**
   - Logado como `cli1@bantads.com.br`, acesse a tela **"Depositar"**.
   - Tente digitar um valor negativo ou zero. A interface deve bloquear ou validar o campo.
   - Digite o valor de `R$ 200,00` e clique em **Confirmar Depósito**.

2. **Verificação Blackbox (Interface):**
   - O saldo na tela inicial deve subir imediatamente de `R$ 800,00` para `R$ 1.000,00`.
   - Deve exibir uma mensagem de sucesso.

3. **Verificação Whitebox (Banco de Dados):**
   - No banco `conta_db` (`localhost:5434`), verifique o saldo atualizado e a nova movimentação inserida:
     ```sql
     SELECT numero, saldo FROM conta WHERE numero = '1291';
     -- Deve retornar saldo = 1000.00
     
     SELECT tipo, valor, saldo_resultante_destino FROM movimentacao 
     WHERE conta_destino_id = (SELECT id FROM conta WHERE numero = '1291')
     ORDER BY data_hora DESC LIMIT 1;
     -- Deve retornar tipo = 'DEPOSITO', valor = 200.00 e saldo resultante = 1000.00
     ```

---

### R6: Sacar (Respeitando Saldo + Limite)
*O cliente saca um valor de sua conta. O saque só é permitido se o valor for menor ou igual ao saldo disponível (saldo + limite).*

1. **Ação no Frontend:**
   - Logado como `cli1@bantads.com.br` (saldo de R$ 1.000,00 e limite de R$ 3.000,00, total disponível = R$ 4.000,00).
   - Acesse a tela **"Sacar"**.
   - Tente sacar `R$ 4.500,00` (valor acima do disponível). O sistema deve exibir um erro de saldo insuficiente.
   - Agora, realize um saque válido de `R$ 1.500,00`.

2. **Verificação Blackbox (Interface):**
   - O saque de R$ 1.500,00 deve ser concluído com sucesso.
   - O novo saldo exibido na tela deve ser de `-R$ 500,00` (destacado em **vermelho**, pois entrou no limite de crédito).

3. **Verificação Whitebox (Banco de Dados):**
   - No banco `conta_db` (`localhost:5434`), execute:
     ```sql
     SELECT numero, saldo, limite FROM conta WHERE numero = '1291';
     -- Deve retornar saldo = -500.00 e limite = 3000.00
     
     SELECT tipo, valor, saldo_resultante_origem FROM movimentacao 
     WHERE conta_origem_id = (SELECT id FROM conta WHERE numero = '1291')
     ORDER BY data_hora DESC LIMIT 1;
     -- Deve retornar tipo = 'SAQUE', valor = 1500.00 e saldo resultante = -500.00
     ```

---

### R7: Transferência (Entre Contas)
*O cliente transfere um valor para outra conta corrente do BANTADS.*

1. **Ação no Frontend:**
   - Logado como `cli1@bantads.com.br` (Catharyna, conta `1291`).
   - Acesse a tela **"Transferir"**.
   - Preencha os campos:
     - **Conta Destino:** `0950` (Conta do Cleuddônio)
     - **Valor:** `R$ 300,00`
   - Clique em **Confirmar Transferência**.

2. **Verificação Blackbox (Interface):**
   - A transferência deve ser efetuada com sucesso.
   - O saldo da Catharyna deve cair de `-R$ 500,00` para `-R$ 800,00`.

3. **Verificação Whitebox (Banco de Dados):**
   - No banco `conta_db` (`localhost:5434`), verifique os saldos de ambas as contas e o registro da movimentação:
     ```sql
     SELECT numero, saldo FROM conta WHERE numero IN ('1291', '0950');
     -- Conta 1291 (Catharyna) deve ter saldo = -800.00
     -- Conta 0950 (Cleuddônio) deve ter saldo = -9700.00 (era -10000.00 + 300.00)
     
     SELECT tipo, valor, conta_origem_id, conta_destino_id FROM movimentacao 
     ORDER BY data_hora DESC LIMIT 1;
     -- Deve retornar tipo = 'TRANSFERENCIA', valor = 300.00, com os IDs de origem e destino corretos.
     ```

4. **Verificação Whitebox (Mensageria & Logs):**
   - A transferência roda uma **SAGA** orquestrada de débito e crédito para garantir que o dinheiro não suma caso um dos lados falhe.
   - Verifique os logs do `ms-saga`:
     ```bash
     docker compose logs ms-saga --tail=50
     ```
   - Você verá os passos de reserva de débito na conta de origem e efetivação de crédito na conta de destino.

---

### R8: Consulta de Extrato (Filtro e Cores)
*O cliente consulta suas movimentações em um período. Entradas em azul, saídas em vermelho, e saldo consolidado diário.*

1. **Ação no Frontend:**
   - Logado como `cli1@bantads.com.br`, acesse **"Extrato"**.
   - Escolha um período que englobe o dia de hoje.

2. **Verificação Blackbox (Interface):**
   - O extrato deve listar todas as operações realizadas hoje:
     - **Depósito de R$ 200,00** (exibido em **azul**, pois é entrada).
     - **Saque de R$ 1.500,00** (exibido em **vermelho**, pois é saída).
     - **Transferência de R$ 300,00** (exibido em **vermelho**, pois é saída).
   - Cada dia listado deve mostrar o saldo consolidado ao final daquele dia.

3. **Verificação Whitebox (Banco de Dados):**
   - No banco `conta_db` (`localhost:5434`), verifique se a query de extrato retorna os mesmos dados:
     ```sql
     SELECT data_hora, tipo, valor, saldo_resultante_origem, saldo_resultante_destino 
     FROM movimentacao 
     WHERE conta_origem_id = (SELECT id FROM conta WHERE numero = '1291')
        OR conta_destino_id = (SELECT id FROM conta WHERE numero = '1291')
     ORDER BY data_hora DESC;
     ```

---

### R9 e R10: Aprovação de Cliente (SAGA Completa)
*O gerente visualiza os cadastros pendentes e aprova um cliente. Isso gera uma conta, limite e envia a senha por e-mail.*

1. **Ação no Frontend:**
   - Faça login como Gerente: `ger1@bantads.com.br` / `tads`.
   - Na tela inicial, você verá a tabela de **"Clientes Pendentes de Aprovação"**.
   - Localize o cliente cadastrado no teste do **R1** (`Manual Test Cliente`, salário R$ 4.500,00).
   - Clique no botão **Aprovar**.

2. **Verificação Blackbox (Interface):**
   - O cliente deve sumir da lista de pendentes.
   - Deve exibir uma mensagem de sucesso indicando que o cliente foi aprovado.

3. **Verificação Whitebox (E-mails - MailHog):**
   - Acesse o MailHog no navegador: `http://localhost:8025`.
   - Você deve ver um novo e-mail enviado para `manual@test.com`.
   - Abra o e-mail e verifique o conteúdo: ele deve conter o número da conta criada (4 dígitos) e a **senha aleatória gerada** para o cliente.
   - **Copie essa senha gerada** para usar no próximo passo.

4. **Verificação Whitebox (Banco de Dados):**
   - No banco `cliente_db` (`localhost:5433`), verifique o status do cliente:
     ```sql
     SELECT nome, status, decisao_gerente_em FROM cliente WHERE email = 'manual@test.com';
     ```
     *(O status deve ser `APROVADO` e a data da decisão deve estar preenchida)*.
   - No banco `conta_db` (`localhost:5434`), verifique se a conta foi criada:
     ```sql
     SELECT numero, saldo, limite, ativa FROM conta 
     WHERE cliente_id = (SELECT id FROM cliente WHERE email = 'manual@test.com');
     ```
     *(A conta deve estar ativa, com saldo `0.00` e limite de `2250.00` — exatamente metade do salário de R$ 4.500,00)*.
   - No MongoDB `auth_db` (`localhost:27017`), verifique o usuário criado:
     ```javascript
     db.usuarios.find({ email: "manual@test.com" })
     ```
     *(O usuário deve existir com o tipo `CLIENTE` e a senha criptografada)*.

5. **Teste de Login do Novo Cliente:**
   - Faça logout do gerente.
   - Tente fazer login com o e-mail `manual@test.com` e a **senha copiada do MailHog**.
   - **Resultado Esperado:** Login efetuado com sucesso, direcionando para a tela inicial do cliente com saldo R$ 0,00 e limite R$ 2.250,00.

---

### R11: Rejeitar Cliente (Com Motivo)
*O gerente recusa uma solicitação de cadastro, informando um motivo. O cliente recebe um e-mail explicativo.*

1. **Ação no Frontend:**
   - Realize um novo autocadastro público (Fase 1) com o CPF `11122233344` e e-mail `rejeitado@test.com`.
   - Faça login como Gerente (`ger1@bantads.com.br`).
   - Na lista de pendentes, clique em **Recusar** no cliente `rejeitado@test.com`.
   - O sistema deve abrir um modal ou campo para digitar o motivo. Digite: `"Documentação de renda inconsistente"`.
   - Confirme a rejeição.

2. **Verificação Blackbox (Interface & MailHog):**
   - O cliente deve sumir da lista de pendentes.
   - Acesse o MailHog (`http://localhost:8025`). Deve haver um e-mail para `rejeitado@test.com` contendo o motivo: `"Documentação de renda inconsistente"`.

3. **Verificação Whitebox (Banco de Dados):**
   - No banco `cliente_db` (`localhost:5433`), verifique o status do cliente:
     ```sql
     SELECT status, motivo_rejeicao, decisao_gerente_em FROM cliente WHERE email = 'rejeitado@test.com';
     ```
     *(O status deve ser `REJEITADO` e o motivo deve estar gravado corretamente)*.
   - No banco `conta_db` e MongoDB `auth_db`:
     *(Nenhum registro de conta ou usuário de autenticação deve ter sido criado)*.

---

### R12 e R13: Consultar Clientes do Gerente
*O gerente visualiza sua carteira de clientes, pesquisa por nome/CPF e acessa os detalhes de um cliente.*

1. **Ação no Frontend:**
   - Logado como Gerente (`ger1@bantads.com.br`), acesse a tela **"Meus Clientes"** (ou Carteira).
   - Digite `"Catharyna"` no campo de busca. A tabela deve filtrar apenas ela.
   - Limpe a busca e digite o CPF da Catharyna (`12912861012`). A tabela deve filtrá-la.
   - Clique no link/botão de detalhes da Catharyna.

2. **Verificação Blackbox (Interface):**
   - A tabela principal deve exibir: CPF, Nome, Cidade, Estado, Saldo e Limite de cada cliente da carteira do gerente, ordenado de forma **crescente por Nome**.
   - A tela de detalhes deve exibir todos os dados cadastrais (endereço completo, telefone, salário) e os dados da conta (número, saldo, limite, data de criação).

3. **Verificação Whitebox (Banco de Dados):**
   - No banco `cliente_db` (`localhost:5433`), verifique quais clientes estão associados ao Gerente 1:
     ```sql
     SELECT nome, cpf, cidade, estado FROM cliente 
     WHERE status = 'APROVADO';
     ```

---

### R14: Consultar 3 Melhores Clientes
*O gerente visualiza os 3 clientes com maiores saldos em conta de todo o banco (independente do gerente).*

1. **Ação no Frontend:**
   - Logado como Gerente, acesse a tela **"Melhores Clientes"** (ou Top 3).

2. **Verificação Blackbox (Interface):**
   - A tela deve exibir exatamente 3 clientes ordenados de forma **decrescente por saldo**.
   - Com base no seed do PDF, os clientes exibidos devem ser:
     1. **Cutardo** (saldo de R$ 150.000,00)
     2. **Coândrya** (saldo de R$ 1.500,00)
     3. **Catharyna** (saldo de ~R$ 800,00 ou o saldo atualizado após seus testes)

3. **Verificação Whitebox (Banco de Dados):**
   - No banco `conta_db` (`localhost:5434`), verifique se a query bate com a tela:
     ```sql
     SELECT numero, saldo FROM conta WHERE ativa = true ORDER BY saldo DESC LIMIT 3;
     ```

---

### R15: Tela Inicial do Administrador (Dashboard de Gerentes)
*O administrador visualiza todos os gerentes, quantidade de clientes de cada um, e a soma de saldos positivos e negativos.*

1. **Ação no Frontend:**
   - Faça login como Administrador: `adm1@bantads.com.br` / `tads`.
   - Observe a tela inicial (Dashboard).

2. **Verificação Blackbox (Interface):**
   - Deve exibir uma lista/cards com todos os gerentes (`Geniéve`, `Godophredo`, `Gyândula`).
   - Para cada gerente, deve mostrar:
     - Quantidade de clientes ativos sob sua responsabilidade.
     - Soma total de saldos positivos de suas contas.
     - Soma total de saldos negativos (exibido com sinal de menos `-`).
   - Os gerentes com **maiores saldos positivos** devem aparecer primeiro na listagem.

3. **Verificação Whitebox (Banco de Dados):**
   - No banco `conta_db` (`localhost:5434`), execute a query de agregação para validar os números exibidos na tela:
     ```sql
     SELECT 
         gerente_id,
         COUNT(*) as total_clientes,
         COALESCE(SUM(CASE WHEN saldo >= 0 THEN saldo ELSE 0 END), 0) as saldos_positivos,
         COALESCE(SUM(CASE WHEN saldo < 0 THEN saldo ELSE 0 END), 0) as saldos_negativos
     FROM conta 
     WHERE ativa = true
     GROUP BY gerente_id;
     ```

---

### R16: Relatório de Clientes (Administrador)
*O administrador visualiza uma lista consolidada de todos os clientes do banco com seus respectivos gerentes.*

1. **Ação no Frontend:**
   - Logado como Administrador, acesse a tela **"Relatório de Clientes"**.

2. **Verificação Blackbox (Interface):**
   - Deve exibir uma tabela com todos os clientes do banco contendo: CPF, Nome, E-mail, Salário, Número da Conta, Saldo, Limite, CPF do Gerente e Nome do Gerente.
   - A lista deve estar ordenada de forma **crescente por nome do cliente**.

3. **Verificação Whitebox (Banco de Dados):**
   - Como essa consulta exige dados de múltiplos microsserviços, o gateway realiza uma **API Composition** (composição de dados).
   - Verifique se os dados exibidos batem com a junção manual dos dados de `cliente_db` e `conta_db`.

---

### R17: Inserção de Gerente (Com Remanejamento de Contas)
*O administrador cadastra um novo gerente. O sistema deve transferir automaticamente as contas do gerente que possui mais contas para o novo gerente.*

1. **Ação no Frontend:**
   - Logado como Administrador, acesse **"Gerentes"** e clique em **"Novo Gerente"**.
   - Preencha o formulário:
     - **CPF:** `11155566622`
     - **Nome:** `Novo Gerente Teste`
     - **E-mail:** `novogerente@bantads.com.br`
     - **Telefone:** `(41) 97777-6666`
     - **Senha:** `tads`
   - Clique em **Salvar**.

2. **Verificação Blackbox (Interface):**
   - O novo gerente deve aparecer na listagem de gerentes.
   - Se você voltar ao Dashboard (R15), verá que o novo gerente agora possui contas sob sua responsabilidade, que foram retiradas do gerente mais sobrecarregado.

3. **Verificação Whitebox (Banco de Dados & SAGA):**
   - O cadastro de gerente dispara uma **SAGA** de inserção e remanejamento de contas.
   - No banco `gerente_db` (`localhost:5435`), verifique se o gerente foi inserido:
     ```sql
     SELECT nome, cpf, email FROM gerente WHERE cpf = '11155566622';
     ```
   - No banco `conta_db` (`localhost:5434`), verifique se as contas foram remanejadas para o ID do novo gerente:
     ```sql
     SELECT numero, gerente_id FROM conta WHERE gerente_id = (SELECT id FROM gerente WHERE cpf = '11155566622');
     ```
     *(O novo gerente deve ter recebido contas do gerente que possuía mais clientes ativos)*.

---

### R18: Remoção de Gerente (Com Remanejamento)
*O administrador remove um gerente. Suas contas devem ser distribuídas para o gerente que possuir menos contas atreladas naquele momento. Não é permitido remover o último gerente.*

1. **Ação no Frontend:**
   - Logado como Administrador, acesse a listagem de **"Gerentes"**.
   - Clique em **Excluir** no gerente que você acabou de criar (`Novo Gerente Teste`).

2. **Verificação Blackbox (Interface):**
   - O gerente deve ser removido com sucesso da listagem.
   - As contas que estavam com ele devem ter sido distribuídas para o gerente com menor carga de clientes.
   - Tente excluir todos os gerentes até sobrar apenas um. O sistema deve **bloquear a exclusão do último gerente** e exibir uma mensagem de erro.

3. **Verificação Whitebox (Banco de Dados & SAGA):**
   - No banco `gerente_db` (`localhost:5435`), o registro do gerente deve ter sido deletado.
   - No banco `conta_db` (`localhost:5434`), verifique se as contas que pertenciam ao gerente excluído foram atualizadas com o `gerente_id` do gerente que possuía menos clientes ativos.

---

### R19 e R20: Listagem e Alteração de Gerente
*O administrador visualiza todos os gerentes e altera seus dados. O gerente alterado deve conseguir fazer login com a nova senha.*

1. **Ação no Frontend:**
   - Logado como Administrador, acesse a listagem de **"Gerentes"**.
   - A lista deve exibir Nome, CPF, E-mail e Telefone de todos, ordenada de forma **crescente por Nome**.
   - Clique em **Editar** no gerente `Geniéve` (`ger1@bantads.com.br`).
   - Altere o nome para `Geniéve Alterada` e a senha para `novasenha`.
   - Clique em **Salvar**.

2. **Verificação Blackbox (Interface):**
   - O nome atualizado deve aparecer na listagem.
   - Faça logout do administrador.
   - Tente fazer login como gerente usando a senha antiga (`tads`). O login deve ser **rejeitado**.
   - Tente fazer login usando a nova senha (`novasenha`).
   - **Resultado Esperado:** Login efetuado com sucesso.

3. **Verificação Whitebox (Banco de Dados):**
   - No banco `gerente_db` (`localhost:5435`), verifique a alteração:
     ```sql
     SELECT nome, email FROM gerente WHERE email = 'ger1@bantads.com.br';
     ```
   - No MongoDB `auth_db` (`localhost:27017`), verifique se o hash da senha foi atualizado na coleção `usuarios`:
     ```javascript
     db.usuarios.find({ email: "ger1@bantads.com.br" })
     ```

---

## 4) Entendendo os Fluxos de SAGA e CQRS (Inspeção Técnica)

### 4.1) Como inspecionar as SAGAs no RabbitMQ
As transações distribuídas (Autocadastro, Alteração de Perfil, Inserção de Gerente, Remoção de Gerente) são coordenadas pelo `ms-saga-orchestrator` usando o RabbitMQ.

Para ver as filas em tempo real durante um teste:
1. Acesse `http://localhost:15672` (guest/guest).
2. Vá na aba **Queues**.
3. Você verá filas como:
   - `cmd.auth` (comandos de criação/deleção de credenciais)
   - `cmd.cliente` (comandos de atualização de status do cliente)
   - `cmd.conta` (comandos de criação/remanejamento de contas)
   - `cmd.email` (comandos de envio de e-mail)
   - `saga-response-queue` (respostas dos microsserviços de volta para o orquestrador)
4. Se uma SAGA travar ou falhar, as mensagens podem se acumular nessas filas ou ir para as filas de **DLQ (Dead Letter Queue)** se houver erros de processamento (ex: Jackson Serialization Exception).

### 4.2) Como funciona o CQRS no ms-conta
O microsserviço de conta implementa a segregação de responsabilidade de escrita e leitura (CQRS):
- **Command Side (Escrita):** Operações que alteram estado (depósito, saque, transferência) são tratadas pelo `ContaCommandController` e gravadas na tabela transacional `conta` e `movimentacao` no PostgreSQL (`conta_db`).
- **Query Side (Leitura):** Consultas de saldo e extrato são tratadas pelo `ContaQueryController` e buscam dados otimizados.
- **Sincronização:** Quando ocorre um depósito, por exemplo, o Command Side publica um evento no RabbitMQ. O Query Side consome esse evento para atualizar o modelo de leitura (no nosso caso, a sincronização é feita de forma consistente e transacional dentro do próprio microsserviço, garantindo que as consultas de saldo e extrato reflitam o estado atualizado imediatamente).

---

## 5) Resolução de Problemas Comuns (Troubleshooting)

* **Autocadastro (ou qualquer API) falha com `Http failure during parsing for http://localhost:4200/api/...`:**
  Você abriu o frontend **direto na porta 4200**, sem passar pelo gateway. O `ng serve`/`serve` devolve o `index.html` (HTML) para rotas desconhecidas como `/api/clientes/`; o Angular tenta parsear como JSON e quebra. **Solução:** use `http://localhost` (porta 80). O gateway encaminha `/api/*` aos microsserviços e `/` ao frontend.
* **Autocadastro retorna 400 com `CPF inválido`:**
  O backend valida os dígitos verificadores do CPF. Gere um CPF válido (ex.: script `scripts/integration/lib/cpf.py`) ou use o do roteiro R1 (`90238475042`).
* **O login falha com erro 401 mesmo com a senha correta:**
  Verifique se o banco MongoDB está de pé e se o reboot foi executado. O `ms-auth` depende do MongoDB para autenticar.
* **O e-mail de aprovação/rejeição não chega:**
  Verifique se o contêiner `ms-email` e o `mailhog` estão rodando. Acesse `http://localhost:8025` para ver se o MailHog está ativo.
* **A aprovação de cliente trava e não conclui:**
  Isso ocorre se a SAGA travar em algum passo. Verifique os logs do orquestrador (`docker compose logs ms-saga`) para ver em qual etapa (gerente, conta, auth ou e-mail) a resposta falhou ou deu timeout.
* **Saldos inconsistentes após muitos testes:**
  Sempre que quiser limpar a sujeira de testes anteriores e começar do zero, basta acessar `http://localhost/api/integration/reboot` no seu navegador.
