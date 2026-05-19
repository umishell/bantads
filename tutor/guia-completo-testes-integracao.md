# Guia completo — testes de integração BANTADS

Este documento explica **todos os testes automatizados** em `scripts/integration/`: o que cada um faz, **por que** existe e como interpretar falhas. Complementa o passo a passo operacional em `integrationTests.md` e os fluxos manuais em `swaggerTests.md` / `httpieTests.md`.

**Última revisão:** levas `5.18[04-30]` e `5.18[05-15]` (reboot completo, seed PDF, transações com erro, ACL no gateway).

---

## Índice

1. [Para que serve esta suíte](#para-que-serve-esta-suíte)
2. [Como os testes “enxergam” o sistema](#como-os-testes-enxergam-o-sistema)
3. [Pré-requisitos e execução](#pré-requisitos-e-execução)
4. [Fixtures e dados seed](#fixtures-e-dados-seed)
5. [Ordem de execução e cuidados](#ordem-de-execução-e-cuidados)
6. [Mapa requisito (R1–R20) → testes](#mapa-requisito-r1r20--testes)
7. [Arquivo por arquivo — todos os testes](#arquivo-por-arquivo--todos-os-testes)
8. [Bibliotecas auxiliares (`lib/`)](#bibliotecas-auxiliares-lib)
9. [Marcadores pytest](#marcadores-pytest)
10. [Relatórios e depuração](#relatórios-e-depuração)
11. [O que a suíte não cobre](#o-que-a-suíte-não-cobre)
12. [Documentos relacionados](#documentos-relacionados)

---

## Para que serve esta suíte

| Objetivo | Por quê |
|----------|---------|
| Validar o **sistema inteiro** após mudanças | Unitários isolados não pegam falhas de gateway, JWT, RabbitMQ ou MailHog. |
| Simular o **cliente real** (front ou Postman) | Tudo passa pelo **API Gateway** em `/api/...`, como na defesa. |
| Garantir **requisitos do enunciado** (R1–R20) | Cada arquivo agrupa cenários por papel (cliente, gerente, admin) ou por fluxo (saga, conta). |
| Regressão repetível | `.\scripts\run-integration-tests.ps1` gera relatórios em `testReports/` para você ou para o agente corrigir falhas. |

A suíte **não substitui** testes manuais de interface (telas Angular) nem gravação de vídeo — cobre **API + mensageria + e-mail**.

---

## Como os testes “enxergam” o sistema

```
pytest  →  HTTP  →  Gateway (:80)  →  ms-auth | ms-cliente | ms-conta | ms-gerente | …
         ↑              ↑
    seed_stack    conta-cliente-guard (JWT + CPF → dono da conta)
                              ↓
                    RabbitMQ (sagas)  →  ms-saga-orchestrator
                              ↓
                    MailHog (:8025)   ←  ms-email (credenciais / rejeição / falha saga)
```

- **Autenticação:** JWT Bearer em `POST /api/auth/login` (senha seed `tads`); token pode incluir claim **`cpf`**.
- **Autorização:** gateway bloqueia perfis errados (`401`/`403`) e valida se o **cliente** opera só na **própria** conta (depósito, saque, transferência, PUT perfil).
- **Sagas:** autocadastro e aprovação/rejeição/falha são **assíncronos**; testes usam `poll_until` e MailHog.
- **Reset:** início da sessão chama `GET /api/integration/reboot` (PostgreSQL + Mongo).

---

## Pré-requisitos e execução

### O que você precisa

1. **Docker** com a stack no ar (`docker compose up -d`).
2. **Python 3.10+** (o script instala `requirements.txt` automaticamente).
3. Executar sempre na **raiz do repositório**.

### Comando principal

```powershell
docker compose build gateway ms-auth ms-cliente ms-conta ms-gerente   # após mudanças
docker compose up -d
$env:BANTADS_SAGA_WAIT_S = "120"
.\scripts\run-integration-tests.ps1
```

### Variáveis úteis

| Variável | Padrão | Motivo |
|----------|--------|--------|
| `BANTADS_GATEWAY` | `http://127.0.0.1` | URL do gateway (porta 80 no compose). |
| `BANTADS_MAILHOG` | `http://127.0.0.1:8025` | Ler e-mails da saga. |
| `BANTADS_SAGA_WAIT_S` | `120` | Tempo máximo aguardando APROVADO/REJEITADO/PENDENTE + MailHog. |
| `BANTADS_POLL_VERBOSE` | `1` | Logs `[poll]` no console durante esperas. |

Detalhes operacionais: `integrationTests.md`.

### Resultado esperado (leva atual)

| Métrica | Valor |
|---------|--------|
| Arquivos de teste | **16** (`test_00` … `test_14`, `test_99`) |
| Casos de teste | **~62** funções `test_*` |
| Falhas aceitáveis | **0** em ambiente saudável (após `docker compose up -d --build`) |

---

## Fixtures e dados seed

Definidas em `scripts/integration/conftest.py`. Rodam **uma vez por sessão** de pytest.

### `seed_stack` — reboot completo (PG + Mongo)

| O quê | `GET /api/integration/reboot` (perfil `full`) |
| Por quê | Reseta **ms-gerente → ms-cliente → ms-conta → ms-auth** e repovoa dados do PDF. |
| Implementação | `lib/integration_reboot.py` |
| Quando falha | Qualquer microsserviço da cadeia fora do ar → login ou seed quebram. |

Reboot manual (debug): `GET http://127.0.0.1/api/integration/reboot`  
Perfil isolado (usado em `test_99`): `?profile=single-gerente`

### `tokens` — JWT por perfil

| Chave | Login | Perfil |
|-------|-------|--------|
| `cliente` | `cli1@bantads.com.br` | CLIENTE (Catharyna) |
| `cliente2` | `cli2@bantads.com.br` | CLIENTE (Cleuddônio, saldo negativo) |
| `gerente` | `ger1@bantads.com.br` | GERENTE (Geniéve) |
| `admin` | `adm1@bantads.com.br` | ADMINISTRADOR (Adamântio) |

**Por quê:** evita login em cada teste; acelera e padroniza permissões.

### `seed_cli1_ids` — CPF e UUID dos clientes 1 e 2

Resolve `GET /api/clientes/{cpf}` com token de gerente e devolve `cpf_cli1`, `cpf_cli2`, `id_cli1`, `id_cli2`.

**Por quê:** rotas de aprovação/saga usam `clienteId` (UUID); rotas de perfil usam CPF.

### `seed_contas` — números de conta (4 dígitos)

| Chave | Valor esperado (PDF) |
|-------|----------------------|
| `numero_cli1` | `1291` |
| `numero_cli2` | `0950` |

A fixture **falha** se o número retornado não bater com `lib/seed_data.py` — detecta seed errado cedo.

### Dados fixos (`lib/seed_data.py`)

CPFs, e-mails, contas, saldos e limites dos cinco clientes do enunciado.

### Clientes e contas no seed (PDF)

| Personagem | CPF | Conta | Saldo (aprox.) | Limite |
|------------|-----|-------|----------------|--------|
| Catharyna | 12912861012 | **1291** | 800 | 5000 |
| Cleuddônio | 09506382000 | **0950** | -10000 | 10000 |
| Catianna | 85733854057 | **8573** | -1000 | 1500 |
| Cutardo | 58872160006 | **5887** | 150000 | 0 |
| Coândrya | 76179646090 | **7617** | 1500 | 0 |

Gerentes: Geniéve, Godophredo, Gyândula. Admin: Adamântio. Senha: **`tads`**.

---

## Ordem de execução e cuidados

O pytest ordena por **nome de arquivo**:

```
test_00 → test_01 → … → test_14 → test_99
```

| Regra | Motivo |
|-------|--------|
| **`test_00` primeiro** | Valida seed PDF antes dos fluxos que alteram saldos. |
| **`test_12` não mexe no cli2 seed** | Encerra conta de **cliente criado na saga** (`autocadastro_aprovado`), não a `0950`. |
| **`test_03` antes de `test_10` para cli2** | `test_r3_cliente_saldo_negativo_seed_cli2` está em `test_03`; `test_10` pode sacar de cli2 e alterar saldo. |
| **`test_99` por último** | Faz `integration_reboot(single-gerente)` e restaura `full` ao final — não depende mais de variável destrutiva. |
| **Testes de saga criam clientes novos** | CPF/e-mail aleatórios — não colidem com seed. |
| **Após falha parcial** | `GET /api/integration/reboot` ou `docker compose down -v` + `up`. |

---

## Mapa requisito (R1–R20) → testes

| Req. | Descrição (resumo) | Onde é testado |
|------|-------------------|----------------|
| **R1** | Autocadastro + falha saga + e-mail duplicado | `test_07`, `test_02` |
| **R2** | Login / logout (token revogado) | `test_01`, `test_10`, `test_11` |
| **R3** | Saldo, limite, disponível, saldo negativo | `test_00`, `test_03`, `test_10` |
| **R4** | Perfil, limite (3 cenários), PUT CPF alheio | `test_04`, `test_10`, `test_13`, `test_14` |
| **R5** | Depositar (+ erros) | `test_03`, `test_11`, `test_14` |
| **R6** | Sacar (+ limite, insuficiente, erros) | `test_03`, `test_10`, `test_11`, `test_14` |
| **R7** | Transferir (+ erros, ACL origem) | `test_03`, `test_14` |
| **R8** | Extrato + encerramento conta | `test_03`, `test_12` |
| **R9** | Pendentes + filtro `para_aprovar` | `test_08`, `test_02` |
| **R10** | Aprovar (saga + gerente mínimo + limite) | `test_02` |
| **R11** | Rejeitar (API + e-mail com motivo) | `test_02`, `test_13` |
| **R12** | Carteira (cidade, estado, ordem) | `test_08`, `test_04` |
| **R13** | Consultar cliente por CPF | `test_08` |
| **R14** | Top 3 (rotas equivalentes) | `test_08`, `test_03` |
| **R15** | Dashboard admin (stats) | `test_09` |
| **R16** | Relatório (campos + equivalência rotas) | `test_09`, `test_04` |
| **R17** | Inserir gerente + conta do gerente com mais clientes | `test_04`, `test_13` |
| **R18** | Remover / remanejar / último gerente | `test_99`, `test_13` |
| **R19** | Listar gerentes (ordem, telefone) | `test_08` |
| **R20** | Alterar gerente (PUT + login) | `test_04` |
| — | Validação seed PDF | `test_00` |
| — | RabbitMQ vivo | `test_06` |
| — | ACL gateway + dono da conta | `test_11`, `test_14` |

---

## Arquivo por arquivo — todos os testes

### `test_00_seed_pdf.py` — validação do seed (PDF)

Marcador: `@pytest.mark.seed`.

| Teste | O que faz | Por quê |
|-------|-----------|---------|
| `test_seed_pdf_contas_e_saldos` | Confirma contas `1291`/`0950` na fixture; saldos/limites dos **5** clientes (cli3–cli5 com login próprio) | Detecta regressão no `ContaSeedService` ou reboot incompleto. |

---

### `test_01_gateway_health_auth.py` — infraestrutura de entrada

| Teste | O que faz | Por quê |
|-------|-----------|---------|
| `test_0_health_gateway` | `GET /health` → `status: up` | Gateway no ar antes de sagas. |
| `test_auth_login_cli1_shape` | Login cli1; `Bearer`, `access_token`, tipo CLIENTE | Contrato mínimo do `ms-auth`. |
| `test_auth_introspect_fixture_token` | Introspect com token da fixture → `active: true` | Token da sessão válido. |
| `test_auth_introspect_and_logout` | Login descartável → introspect → logout → introspect **401** | Logout revoga token (**R2**). |

---

### `test_02_saga_aprovacao.py` — sagas (R1, R10, R11)

Marcadores: `@pytest.mark.saga`, `@pytest.mark.timeout(120–180)`.

| Teste | O que faz | Por quê |
|-------|-----------|---------|
| `test_saga_aprovacao_autocadastro_mailhog_e_conta` | Autocadastro → pendente → aprovar 202 → poll APROVADO → MailHog → login → conta 4 dígitos → limite = salário/2 → **gerente com menor carteira ganha +1 cliente** | Fluxo feliz completo (**R1**, **R10**). |
| `test_saga_rejeicao_gerente` | Rejeição com motivo → poll REJEITADO → **e-mail contém o motivo** → API `motivoRejeicao` + `decisaoGerenteEm` | **R11** completo. |
| `test_saga_falha_aprovacao_email_e_volta_pendente` | E-mail `@itest.saga-fail.` → aprovar → volta **PENDENTE** + e-mail de falha no MailHog | Ramo de compensação **R1**. |

**Se falhar:** `BANTADS_SAGA_WAIT_S`; logs `ms-saga`, `ms-email`, RabbitMQ, MailHog.

---

### `test_03_conta_transacoes.py` — operações bancárias (R3, R5–R8, R7)

| Teste | O que faz | Por quê |
|-------|-----------|---------|
| `test_r3_cliente_saldo_negativo_seed_cli2` | Saldo e limite exatos do seed em cli2 (**-10000** / **10000**) | **R3** antes de qualquer teste que altere cli2. |
| `test_conta_saldo_extrato_deposito_saque_transferencia` | Depósito, saque, transferência; confere **saldos** origem/destino; extrato com `contraparteContaNumero`, `natureza`, `saldoApos` | **R5, R6, R7, R8** em um fluxo. |
| `test_transferencia_mesma_conta_retorna_erro` | Origem = destino → **400** | Regra explícita. |
| `test_gerente_patch_limite` | PATCH limite 999.99 → cliente vê o valor | Gerente altera limite manualmente. |
| `test_gerente_top3_e_listagem` | `top3` ordenado por saldo; campos `numero` e `saldo`; listagem `/api/contas` | **R14** (via contas). |

---

### `test_04_cliente_gerente_admin.py` — perfis e CRUD administrativo

| Teste | O que faz | Por quê |
|-------|-----------|---------|
| `test_cliente_put_perfil` | PUT perfil cli1 | **R4** básico. |
| `test_gerente_carteira_e_filtros` | Carteira e `melhores_clientes` | **R12/R14**. |
| `test_admin_gerentes_crud_e_stats` | CRUD gerente; PUT altera nome; **login com `tads` após PUT** | **R17–R20** (senha nova via saga auth ainda pendente no back-end). |
| `test_admin_contas_agregados_por_gerente` | Agregados por gerente | **R15**, **R17/R18**. |

---

### `test_06_rabbitmq_management.py` — broker

| Teste | O que faz | Por quê |
|-------|-----------|---------|
| `test_rabbitmq_management_reachable` | API management `:15672` | Diagnóstico se sagas falharem em massa. |

---

### `test_07_r1_autocadastro.py` — R1 isolado (sem saga completa)

| Teste | O que faz | Por quê |
|-------|-----------|---------|
| `test_autocadastro_publico_sem_bearer_retorna_201` | POST sem JWT → 201 | Cadastro público. |
| `test_autocadastro_mensagem_solicitacao_enviada` | Mensagem de solicitação assíncrona | Contrato UX. |
| `test_autocadastro_cpf_duplicado_retorna_409` | CPF do cli1 seed → 409 | Unicidade CPF. |
| `test_autocadastro_cpf_duplicado_mesmo_pendente_409` | Mesmo CPF, e-mails diferentes → 409 | Pendente duplicado. |
| `test_autocadastro_email_duplicado_retorna_409` | E-mail do cli1, CPF novo → 409 | Unicidade e-mail. |

---

### `test_08_gerente_consultas.py` — telas do gerente (R9, R12–R14, R19)

| Teste | O que faz | Por quê |
|-------|-----------|---------|
| `test_r9_pendentes_lista_campos_para_aprovacao` | Campos em `/pendentes` | Tela de aprovação. |
| `test_r13_gerente_consulta_cliente_por_cpf` | Consulta cli1 por CPF | **R13**. |
| `test_r12_carteira_campos_e_ordenacao_por_nome` | `cidade`, `estado`, `conta`, `saldo`, `limite`, `gerenteNome`; ordem por nome | **R12**. |
| `test_r14_melhores_clientes_ate_tres_ordenados_por_saldo` | Até 3 itens; saldos decrescentes; **cidade/estado** | **R14**. |
| `test_r9_para_aprovar_filtro_equivalente_pendentes` | `filtro=para_aprovar` ≡ `/pendentes` (mesmos IDs) | Swagger / gateway. |
| `test_r19_admin_lista_gerentes_ordenada_com_telefone` | Lista ordenada por nome; telefone em todos; consulta por CPF | **R19** completo. |

---

### `test_09_admin_dashboard.py` — administrador (R15, R16)

| Teste | O que faz | Por quê |
|-------|-----------|---------|
| `test_r15_stats_dashboard_campos` | Campos do dashboard | **R15**. |
| `test_r15_stats_ordenado_saldos_positivos_desc` | Ordem por saldos positivos | Regra do enunciado. |
| `test_r16_relatorio_clientes_campos` | Campos do relatório | **R16**. |
| `test_r16_relatorio_ordenado_nome_cliente` | Ordem por nome do cliente | Consistência. |
| `test_r16_relatorio_via_filtro_adm` | Rota com filtro administrativo | Alternativa de front. |
| `test_r16_report_equivalente_ao_filtro_adm` | Mesmo conjunto de **CPFs** em `/report` e no filtro | Equivalência de rotas. |

---

### `test_10_cliente_operacoes.py` — cliente no dia a dia (R2, R3, R4, R6)

| Teste | O que faz | Por quê |
|-------|-----------|---------|
| `test_r2_login_credenciais_invalidas_401` | Senha errada → 401 | Segurança login. |
| `test_r3_cliente_saldo_limite_e_disponivel` | `saldoDisponivel = saldo + limite` | Tela inicial (**R3**). |
| `test_r4_alterar_perfil_reflete_na_consulta` | PUT perfil; gerente vê nome/cidade/estado; **limite = metade do salário**; `gerenteNome` na carteira | **R4** integrado cliente + conta. |
| `test_r6_saque_saldo_insuficiente_retorna_422` | Saque enorme → 422 | Regra saldo+limite. |
| `test_r6_saque_com_limite_conta_negativa_cli2` | Saque parcial em cli2 usando limite | Cleuddônio (**R6**). |

---

### `test_11_acl_perfis.py` — segurança no gateway

| Teste | O que faz | Por quê |
|-------|-----------|---------|
| `test_sem_bearer_retorna_401` | Sem token → 401 | Rotas protegidas. |
| `test_cliente_nao_acessa_pendentes_403` | Cliente em pendentes → 403 | Só gerente. |
| `test_cliente_nao_acessa_relatorio_admin_403` | Cliente em `/report` → 403 | Dado admin. |
| `test_cliente_nao_cria_gerente_403` | Cliente POST gerente → 403 | Papéis separados. |
| `test_gerente_nao_acessa_stats_admin_403` | Gerente em `/stats` → 403 | Dashboard admin. |
| `test_gerente_nao_acessa_relatorio_admin_403` | Gerente em `/report` → 403 | Idem. |
| `test_admin_nao_posta_deposito_cliente_403` | Admin deposita → 403 | Operação de cliente. |
| `test_admin_pode_listar_gerentes_200` | Admin lista gerentes → 200 | Admin tem acesso correto. |
| `test_r5_cliente_nao_deposita_em_conta_alheia_403` | cli1 deposita na conta cli2 → 403 | **R5** (gateway + `conta-cliente-guard`). |
| `test_r6_cliente_nao_saca_de_conta_alheia_403` | cli1 saca na conta cli2 → 403 | **R6**. |
| `test_gerente_pode_consultar_gerente_por_cpf_403` | Gerente consulta gerente por CPF → 403 | **R19** só admin. |

---

### `test_12_gerente_conta_r8.py` — encerramento de conta (saga)

Marcadores: `@pytest.mark.saga`, `@pytest.mark.timeout(180)`.

| Teste | O que faz | Por quê |
|-------|-----------|---------|
| `test_r8_gerente_encerra_conta_saga_e_deposito_falha` | `autocadastro_aprovado` → gerente DELETE conta → cliente não pode **depositar, sacar nem transferir** (409/422) | **R8** sem inativar conta seed cli2. |

Usa `lib/saga_flow.py` (`autocadastro_aprovado`).

---

### `test_13_enunciado_gaps.py` — regras de negócio reforçadas

| Teste | O que faz | Por quê |
|-------|-----------|---------|
| `test_r4_recalcula_limite_apos_alterar_salario` | Salário 8000 → limite 4000 | Metade do salário. |
| `test_r4_salario_menor_2000_limite_zero` | Salário 1500 → limite 0 | Regra &lt; 2000. |
| `test_r4_saldo_negativo_piso_limite_cli2` | Altera salário cli2; limite ≥ \|saldo\| | Piso com saldo negativo. |
| `test_r11_motivo_e_data_na_consulta_por_cpf` | Rejeição + e-mail com motivo + API | **R11** reforçado. |
| `test_r17_novo_gerente_recebe_conta_do_gerente_com_mais_clientes` | Novo gerente +1 conta; origem com mais clientes -1 | **R17** literal. |
| `test_r18_remaneja_para_gerente_com_menos_contas` | Remove gerente temp; contas vão para gerente com **menos** clientes | **R18** literal. |

---

### `test_14_transacoes_erros.py` — ramos de erro (R4–R7)

| Teste | O que faz | Por quê |
|-------|-----------|---------|
| `test_r7_transferencia_conta_destino_inexistente_404` | Destino `0000` → 404 | Conta inexistente. |
| `test_r7_transferencia_saldo_insuficiente_422` | Valor acima do disponível → 422 | **R7** negativo. |
| `test_r7_cliente_nao_transfere_da_conta_alheia_403` | Path = conta de outro → 403 | Dono da conta no path. |
| `test_r5_deposito_valor_zero_400` | Depósito 0 → 400 | Validação entrada. |
| `test_r6_saque_valor_negativo_400` | Saque negativo → 400 | Validação entrada. |
| `test_r4_cliente_nao_altera_perfil_de_outro_cpf_403` | PUT no CPF do cli2 com token cli1 → 403 | Perfil só do próprio CPF. |

---

### `test_99_r18_gerente_remocao.py` — **executar por último**

| Teste | O que faz | Por quê |
|-------|-----------|---------|
| `test_r18_remove_gerente_criado_pelo_admin` | Cria e remove gerente temporário → `ativo: false` | Soft delete (**R18**). |
| `test_r18_nao_remove_ultimo_gerente_ativo` | Reboot `single-gerente`; cria 2º gerente; remove o extra; bloqueia remoção do último → **422**; reboot `full` | Último gerente sem destruir seed da suíte inteira. |

---

## Bibliotecas auxiliares (`lib/`)

| Módulo | Função |
|--------|--------|
| `gateway_client.py` | HTTP; `poll_until`; normaliza URLs; sugestões de falha nos relatórios. |
| `integration_reboot.py` | `integration_reboot(gateway, profile)` → `GET /api/integration/reboot`. |
| `saga_flow.py` | `autocadastro_aprovado()` — fluxo saga feliz reutilizável (`test_12`). |
| `cpf.py` | CPF válido para autocadastros únicos. |
| `autocadastro.py` | `body_autocadastro()` — payload padrão R1. |
| `mailhog.py` | `buscar_senha_provisoria`, `buscar_email_rejeicao`, `buscar_email_rejeicao_com_motivo`, `buscar_email_falha_saga`. |
| `seed_data.py` | Constantes PDF (CPF, contas, saldos, e-mails). |
| `seed_pdf.py` | Aliases/documentação de contas PDF (opcional). |
| `report_names.py` | ID de leva e carimbo BRT nos relatórios. |

### Gateway (não é `lib/`, mas afeta testes)

| Arquivo | Função |
|---------|--------|
| `gateway/src/conta-cliente-guard.js` | Cliente só opera na própria conta; PUT perfil só no próprio CPF. |
| `gateway/src/integration-reboot.js` | Orquestra reboot dos microsserviços. |

---

## Marcadores pytest

| Marcador | Significado |
|----------|-------------|
| `gateway` | Quase todos — chamada via API Gateway. |
| `saga` | Fluxos longos com RabbitMQ + MailHog (`test_02`, `test_12`). |
| `seed` | Validação do seed PDF (`test_00`). |
| `timeout(N)` | Limite de segundos em sagas. |

Filtrar exemplos:

```powershell
cd scripts\integration
$env:PYTHONPATH = "$PWD"
python -m pytest tests -m saga -v
python -m pytest tests/test_14_transacoes_erros.py -v
python -m pytest tests/test_00_seed_pdf.py -v
```

---

## Relatórios e depuração

Após `run-integration-tests.ps1`:

| Pasta | Conteúdo |
|-------|----------|
| `testReports/working/` | Lista do que **passou**. |
| `testReports/issues/` | Falhas + sugestões (`agent-feedback`). |
| `testReports/logs/junit/` | XML para CI. |
| `testReports/logs/pytest/` | Console completo (inclui `[poll]`). |
| `testReports/logs/docker/` | Logs dos containers (se falhou). |
| `testReports/corrections/` | Correções por leva (`5.18[04-30]`, `5.18[05-15]`, …). |

### Checklist quando um teste falha

1. Leia o assert (status HTTP esperado vs obtido).
2. Abra o último `testReports/issues/*agent-feedback*.md`.
3. **401/403** → perfil, token revogado ou conta alheia; veja `test_11` / `test_14`.
4. **404/422** em transferência → `test_14` e logs `ms-conta`.
5. **502** → upstream fora ou URL sem barra final.
6. **Timeout saga** → RabbitMQ, `ms-saga`, MailHog; aumente `BANTADS_SAGA_WAIT_S`.
7. **Seed errado** → falha em `test_00` ou `seed_contas`; rode `GET /api/integration/reboot`.
8. **Estado sujo** → `integration/reboot` ou `docker compose down -v`.

---

## O que a suíte não cobre

| Item | Por quê não está (ou só parcialmente) |
|------|--------------------------------------|
| **Front-end Angular** | Cores do extrato, saldo vermelho, busca na carteira. |
| **Saldo consolidado por dia no extrato** | API retorna lançamentos, não série diária vazia. |
| **Busca por CPF/nome na carteira (R12)** | Sem query na API `GET /clientes`. |
| **Troca de senha do gerente após PUT (R20)** | PUT aceita senha; persistência no `ms-auth` via saga ainda pendente. |
| **Spy RabbitMQ em R4/R17/R18** | Testes validam efeito HTTP, não mensagens nas filas. |
| **CQRS / atraso read model** | Sem teste de consistência eventual isolado. |
| **Performance / carga** | Suíte funcional. |
| **Deploy em nuvem** | Assume Docker local (portas padrão). |

Para lacunas conhecidas e status por requisito: [`auditoria-testes-integracao.md`](auditoria-testes-integracao.md).

---

## Documentos relacionados

| Documento | Uso |
|-----------|-----|
| `tutor/integrationTests.md` | Como **rodar** a suíte. |
| `tutor/auditoria-testes-integracao.md` | Auditoria R1–R20 vs cobertura atual. |
| `tutor/swaggerTests.md` | Passo a passo **manual** no Swagger. |
| `tutor/httpieTests.md` | Requisições HTTPie. |
| `tutor/fluxo-autocadastro-fase1-fase2-rollback.md` | Teoria da saga de cadastro. |
| `testReports/corrections/5.18[04-30](auditoria-integracao-reboot-seed)corrections.md` | Reboot, seed PDF, sagas. |
| `testReports/corrections/5.18[05-15](auditoria-transacoes-acl-suite)corrections.md` | Transações com erro, ACL, test_14. |
| `testReports/corrections/5.18[03-04](lacunas-enunciado-backend)corrections.md` | Back-end R4, R7, R11, R17, R18. |

---

## Resumo em uma frase

A suíte faz **reboot completo** do ambiente, valida o **seed do PDF** (`test_00`), executa **~62 cenários** pelo gateway — sagas, MailHog, transações felizes e de erro, ACL de conta — e grava em `testReports/` o resultado; termine com `test_99` e use `GET /api/integration/reboot` se algo falhar no meio da suíte.
