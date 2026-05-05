# Fluxo de Autocadastro BANTADS (Fase 1, Fase 2 e Rollback)

## 1) Objetivo e premissas

Este documento define, de forma operacional, o fluxo de autocadastro em duas fases com SAGA orquestrada.

Premissas obrigatórias:

- Comunicação síncrona com front: **HTTP via API Gateway**.
- Comunicação assíncrona entre microserviços: **RabbitMQ**.
- Orquestração de passos assíncronos: **ms-saga-orchestrator**.
- Nenhum MS deve enviar comando assíncrono direto para outro MS sem passar pela saga.
- Estado de negócio do cadastro é fonte de verdade no **ms-cliente**.

---

## 2) Status do cliente no ms-cliente

- `PENDENTE_APROVACAO`: cadastro inicial concluído, aguardando gerente.
- `PROCESSANDO_APROVACAO`: aprovação iniciada e saga em andamento.
- `APROVADO`: somente após envio de e-mail com credenciais confirmado.
- `REJEITADO`: reprovação manual (com motivo).

Transições válidas:

- Novo cadastro -> `PENDENTE_APROVACAO`
- `PENDENTE_APROVACAO` -> `PROCESSANDO_APROVACAO`
- `PROCESSANDO_APROVACAO` -> `APROVADO`
- `PENDENTE_APROVACAO` -> `REJEITADO`
- Falha terminal da saga: `PROCESSANDO_APROVACAO` -> `PENDENTE_APROVACAO`

---

## 3) Fase 1 (autocadastro público)

## 3.1 Entrada

1. Front chama `POST /api/clientes` (rota pública no gateway).
2. Gateway encaminha para `ms-cliente`.

## 3.2 Regras no ms-cliente

1. Validar payload e normalizar CPF/CEP.
2. Verificar duplicidade de CPF (estados bloqueantes).
3. Se duplicado: HTTP `409`.
4. Persistir cliente em PostgreSQL (`cliente_db`, serviço Docker **`db-cliente`**, tabela **`cliente`**) com `PENDENTE_APROVACAO`.
5. Publicar evento para saga (somente saga consome), com `sagaId` e `correlationId`.

Evento sugerido:

- `eventType: CLIENTE_PENDENTE_CRIADO`
- routing key: `evt.cliente.pendente.criado`
- payload: `clienteId`, `cpf`, `nome`, `email`, `salario`, etc.

## 3.3 Resposta ao front

HTTP `201` com mensagem clara:

- solicitação recebida;
- aguardar aprovação do gerente;
- senha será enviada por e-mail somente após aprovação.

Observação: a Fase 1 de negócio termina no `ms-cliente` (cliente pendente).

---

## 4) Fase 2 (aprovação e provisionamento)

## 4.1 Consultar pendentes

1. Front gerente chama `GET /api/clientes/pendentes`.
2. Gateway exige JWT com perfil `GERENTE`.
3. `ms-cliente` retorna apenas `PENDENTE_APROVACAO`.

## 4.2 Aprovar cliente

1. Front gerente chama `POST /api/clientes/{id}/aprovar`.
2. Gateway exige JWT `GERENTE`.
3. `ms-cliente` valida estado:
   - se `PENDENTE_APROVACAO`: segue;
   - se `PROCESSANDO_APROVACAO` ou `APROVADO`: `409` (idempotência/estado inválido).
4. Em transação local, atualizar para `PROCESSANDO_APROVACAO`.
5. Publicar evento para saga:
   - `eventType: CLIENTE_APROVACAO_INICIADA`
   - routing key: `evt.cliente.aprovacao.iniciada`
   - snapshot mínimo necessário para conta/auth/email.

## 4.3 Orquestração da saga (fluxo feliz)

1. Saga recebe `CLIENTE_APROVACAO_INICIADA`.
2. Saga -> `ms-gerente`: `GERENTE_LIST_ATIVOS`.
3. Saga -> `ms-conta`: `CONTA_COUNTS_BY_GERENTE`.
4. Saga escolhe gerente por menor carga (contas ativas) e empate por menor CPF.
5. Saga -> `ms-conta`: `CONTA_CREATE`.
6. `ms-conta` responde com `contaId` e número de conta (4 dígitos).
7. Saga -> `ms-auth`: `AUTH_CREATE_CLIENTE`.
8. `ms-auth` cria usuário CLIENTE com senha aleatória (hash+salt persistido).
9. Saga -> `ms-email`: `EMAIL_SEND_CREDENTIALS`.
10. `ms-email` envia e-mail com login/senha.
11. Saga -> `ms-cliente`: `CLIENTE_MARCAR_APROVADO`.
12. `ms-cliente` muda `PROCESSANDO_APROVACAO` -> `APROVADO`.

---

## 5) Contrato de mensageria (mínimo)

Toda mensagem assíncrona deve carregar:

- `sagaId` (UUID do fluxo)
- `correlationId` (UUID da etapa request/response)
- `source` e `intent`/`eventType`/`command`
- `clienteId` quando aplicável
- `timestamp`

Regras:

- Respostas de `ms-gerente`, `ms-conta`, `ms-auth`, `ms-email` voltam sempre para a saga.
- A saga decide próximo passo, retry e compensação.

---

## 6) Rollback/Compensação da saga (detalhado)

## 6.1 Política global

- Retry de envio de e-mail: **3 tentativas**.
- Se falha terminal em qualquer etapa após entrar em `PROCESSANDO_APROVACAO`:
  - executar compensações na ordem inversa;
  - retornar cliente para `PENDENTE_APROVACAO`;
  - nunca marcar `APROVADO` em falha parcial.

## 6.2 Matriz de compensação

| Falha detectada após | Ações de compensação |
|---|---|
| Escolha de gerente falhou | Encerrar saga com falha e voltar cliente para `PENDENTE_APROVACAO` |
| Conta falhou ao criar | Voltar cliente para `PENDENTE_APROVACAO` |
| Conta criada, auth falhou | `CONTA_DELETE` (ou inativação lógica), depois voltar cliente para `PENDENTE_APROVACAO` |
| Auth criado, email falhou (após retries) | `AUTH_DELETE_USER`, `CONTA_DELETE`/inativar, voltar cliente para `PENDENTE_APROVACAO` |
| Falha ao marcar aprovado no cliente | Repetir comando idempotente; se irreparável, abrir incidente e manter `PROCESSANDO_APROVACAO` até reconciliação |

## 6.3 Compensação por microserviço e banco

### ms-conta (PostgreSQL `conta_db`, serviço Docker `db-conta`)

- Comando compensatório: `CONTA_DELETE`.
- Estratégia recomendada: **inativação lógica** (`ativa=false`) para preservar trilha.
- Idempotência: repetir `CONTA_DELETE` não deve falhar.

### ms-auth (MongoDB `auth_db`, serviço Docker `mongo-auth`)

- Comando compensatório: `AUTH_DELETE_USER`.
- Remover usuário por login (e-mail) criado pela saga.
- Idempotência: se usuário não existir mais, responder sucesso idempotente.

### ms-email

- Não possui compensação de "desenvio".
- Apenas retry de envio (`N=3`) e resposta de falha para saga ao esgotar.

### ms-cliente (PostgreSQL `cliente_db`, serviço Docker `db-cliente`)

- Comando de rollback: `CLIENTE_MARCAR_PENDENTE`.
- Regra: só aplicar se estado atual for `PROCESSANDO_APROVACAO`.
- Registrar motivo técnico resumido da falha (sem dados sensíveis).

---

## 7) Consistência de dados por fase

## 7.1 Fase 1

- Banco cliente: 1 registro em `PENDENTE_APROVACAO`.
- Nenhum registro em conta/auth obrigatório nessa fase.

## 7.2 Fase 2 (feliz)

- Banco cliente: `APROVADO`.
- Banco conta: conta ativa criada e vinculada a `clienteId` + `gerenteId`.
- Banco auth: usuário CLIENTE ativo.
- E-mail: credenciais enviadas.

## 7.3 Fase 2 (com rollback)

- Banco cliente: volta para `PENDENTE_APROVACAO`.
- Banco conta: conta removida/inativada.
- Banco auth: usuário removido.
- E-mail: pode não ter sido enviado (ou falhou), sem impacto de credenciais ativas remanescentes.

---

## 8) Avisos de erro para o front

## 8.1 Durante operações HTTP

- `POST /api/clientes`:
  - `201` sucesso;
  - `409` CPF duplicado;
  - `400` payload inválido.
- `POST /api/clientes/{id}/aprovar`:
  - `202`/`200` aceito para processamento;
  - `409` estado inválido (`APROVADO`/`PROCESSANDO_APROVACAO`/`REJEITADO`);
  - `404` cliente não encontrado.

## 8.2 Após aceite da aprovação (processamento assíncrono)

Como a etapa é assíncrona, o front deve:

1. Exibir mensagem de processamento: "Aprovação em andamento."
2. Atualizar tela de pendentes/listagem periodicamente (polling) ou por atualização manual.
3. Se saga falhar e cliente voltar para `PENDENTE_APROVACAO`, exibir:
   - "Não foi possível concluir a aprovação neste momento. Tente aprovar novamente."

Não expor detalhes internos de infraestrutura (fila, stack trace, senha, etc.).

---

## 9) Idempotência obrigatória

- Saga: dedupe por `sagaId + etapa`.
- Handlers de comando: reprocessamento não deve duplicar conta/usuário.
- Marcação de status no cliente deve ser segura para repetição.

---

## 10) Checklist de aceite técnico

1. Autocadastro retorna `201` com mensagens de espera/e-mail pós-aprovação.
2. Pendentes somente para perfil GERENTE.
3. Aprovação muda para `PROCESSANDO_APROVACAO` e inicia saga sem duplicação.
4. Fluxo feliz termina com conta + auth + e-mail + cliente `APROVADO`.
5. Falha intermediária aciona rollback/compensação e cliente não fica `APROVADO` indevidamente.

