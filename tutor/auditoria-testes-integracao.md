# Auditoria — testes de integração vs enunciado BANTADS

Reanálise da suíte executada por `scripts/run-integration-tests.ps1`, usando como referência **`c:\Users\zuria\CODE\UFPR\DAC\all bantads intructions.md`** (R1–R20, dados pré-cadastrados, sagas e CQRS).

**Última atualização:** leva `5.18[04-30]` — correções de lacunas da auditoria anterior + guarda de propriedade de conta no gateway.

**Escopo:** **16** arquivos `test_*.py`, **~62** funções `test_*` em `scripts/integration/tests/`.  
**Não avaliado aqui:** front-end (cores do extrato, busca textual R12), saldo consolidado por dia no extrato (API não expõe), vídeo de defesa, spy explícito em filas RabbitMQ.

---

## Resumo executivo (estado atual)

| Dimensão | Situação |
|----------|----------|
| **Ambiente reproduzível** | ✅ `GET /api/integration/reboot` (PG + Mongo) no `seed_stack` |
| **Seed PDF** | ✅ Contas `1291`, `0950`, `8573`, `5887`, `7617` + saldos em `test_00` |
| **Transações felizes** | ✅ Depósito, saque, transferência com saldos e extrato |
| **Transações com erro** | ✅ 404 destino, 422 saldo, 400 valor inválido, 403 conta alheia |
| **Sagas R1/R10/R11** | ✅ Aprovação, rejeição, falha e-mail, atribuição gerente mínimo |
| **R17/R18** | ✅ Agregados antes/depois; `test_99` isolado com reboot `single-gerente` |
| **ACL conta do cliente** | ✅ Gateway `conta-cliente-guard.js` + testes `test_11` / `test_14` |
| **Cobertura literal PDF** | ⚠️ ~**90%** HTTP; itens só UI/CQRS/saldo diário permanecem fora |

A suíte passa a ser **adequada para regressão e defesa técnica do back-end via gateway**, desde que a stack seja reconstruída após mudanças em `gateway`, `ms-auth` e `ms-cliente`.

---

## Plano de correções aplicado (5.18[04-30])

| ID | Problema | Correção |
|----|----------|----------|
| C1 | `test_99` destruía seed | Reboot `single-gerente` + gerente temporário; restaura `full` ao final |
| C2 | `test_12` encerrava cli2 seed | Encerramento em conta criada na saga (`test_12`) |
| C3 | Reboot só Mongo | `integration/reboot` + `conftest.seed_stack` |
| C4 | Sem teste falha saga R1 | `test_saga_falha_aprovacao_email_e_volta_pendente` |
| A1–A8, A7 | Lacunas R4/R7/R8/ACL | `test_13`, `test_03`, `test_11`, `test_14` |
| A9, A10 | R19/R20 | `test_08`, login pós-PUT em `test_04` |
| A11 | `para_aprovar` | `test_r9_para_aprovar_filtro_equivalente_pendentes` |
| A12 | Seed PDF | `test_00` + `ContaSeedService` |
| M2, M8 | Saque limite / timeout | `test_r6_saque_com_limite_cli2`; `BANTADS_SAGA_WAIT_S=120` |
| M3 | Logout | `test_01` introspect **401** após logout (token revogado) |
| M5, M11 | Relatório / e-mail dup | `test_r16_report_equivalente_*`; `existsByEmail` + `test_07` |
| P1–P3 transações | Erros e equivalências | Novo `test_14_transacoes_erros.py` |
| ACL back-end | ms-conta sem dono | **Gateway** valida CPF JWT vs `clienteId` da conta |

---

## Arquivos da suíte (mapa)

| Arquivo | Foco |
|---------|------|
| `test_00_seed_pdf.py` | Seed PDF: contas e saldos dos 5 clientes |
| `test_01_gateway_health_auth.py` | Health, login, introspect, logout revoga token |
| `test_02_saga_aprovacao.py` | R1/R10/R11: aprovação, rejeição, falha saga |
| `test_03_conta_transacoes.py` | R3/R5–R8/R7: movimentações felizes + extrato |
| `test_04_cliente_gerente_admin.py` | CRUD gerente + **R20 login nova senha** |
| `test_06_rabbitmq_management.py` | Broker acessível |
| `test_07_r1_autocadastro.py` | Autocadastro público + CPF/e-mail duplicado |
| `test_08_gerente_consultas.py` | R9–R14, R19 |
| `test_09_admin_dashboard.py` | R15/R16 + equivalência report/filtro |
| `test_10_cliente_operacoes.py` | R2/R3/R4/R6 |
| `test_11_acl_perfis.py` | ACL perfis + R5/R6 conta alheia |
| `test_12_gerente_conta_r8.py` | Encerramento saga + depósito/saque/transfer bloqueados |
| `test_13_enunciado_gaps.py` | R4 limite (3 cenários), R11, R17, R18 |
| `test_14_transacoes_erros.py` | R5–R7 erros + R4 PUT CPF alheio |
| `test_99_r18_gerente_remocao.py` | R18 último gerente (isolado) |

---

## Problemas críticos — status

### C1 — `test_99` destrutivo — **RESOLVIDO**

- `test_r18_nao_remove_ultimo_gerente_ativo` usa `integration_reboot(single-gerente)`, cria um gerente extra, remove o extra, bloqueia remoção do último, depois `integration_reboot(full)`.
- Não depende mais de `BANTADS_DESTRUCTIVE_R18=1`.

### C2 — Ordem `test_12` vs cli2 — **RESOLVIDO**

- Saldo negativo cli2: `test_03` `test_r3_cliente_saldo_negativo_seed_cli2`.
- Encerramento: conta de cliente **saga** em `test_12`; cli2 seed permanece ativo.

### C3 — Reboot PostgreSQL — **RESOLVIDO**

- `conftest.seed_stack` → `GET /api/integration/reboot?profile=full`.

### C4 — E-mail falha saga R1 — **RESOLVIDO**

- `test_saga_falha_aprovacao_email_e_volta_pendente` + hook `@itest.saga-fail.` no `ms-email`.

---

## Problemas de alta severidade — status

| ID | Status | Onde |
|----|--------|------|
| A1 R4 limite | ✅ | `test_13` (3 cenários) + limite em `test_10` após PUT salário |
| A2 R8 extrato | ✅ | `test_03`: contraparte, natureza, saldoApos |
| A3 R12/R14 campos | ✅ | cidade/estado; top3 ≡ melhores_clientes |
| A4 R17/R18 | ✅ | Agregados gerente origem/destino em `test_13` |
| A5 R10 gerente mínimo | ✅ | `test_02` agregados antes/depois aprovação |
| A6 R11 e-mail motivo | ✅ | `buscar_email_rejeicao_com_motivo` |
| A7 R5/R6 ACL | ✅ | `test_11` + gateway guard |
| A8 Transferência saldos | ✅ | `test_03` |
| A9 R19 | ✅ | Listagem ordenada + telefone |
| A10 R20 | ⚠️ | PUT + login senha cadastro; troca senha via saga auth pendente |
| A11 R9 filtro | ✅ | `para_aprovar` ≡ pendentes |
| A12 Seed PDF | ✅ | `test_00` |

**Ressalva R17/R18:** em **empate** de contagem entre gerentes, o back-end desempata por soma de saldos positivos + UUID; o teste usa o primeiro ID entre empatados no máximo — possível falso negativo raro se a implementação escolher outro empate.

---

## Transações HTTP — matriz de cobertura

| Operação / regra | Cobertura |
|------------------|-----------|
| GET saldo / limite / disponível | ✅ |
| POST depositar (feliz) | ✅ |
| POST depositar conta alheia | ✅ 403 |
| POST depositar valor 0 | ✅ 400 |
| POST sacar (feliz / insuficiente / limite negativo) | ✅ |
| POST sacar conta alheia | ✅ 403 |
| POST sacar valor negativo | ✅ 400 |
| POST transferir (feliz + saldos + extrato) | ✅ |
| POST transferir mesma conta | ✅ 400 |
| POST transferir destino inexistente | ✅ 404 |
| POST transferir saldo insuficiente | ✅ 422 |
| POST transferir da conta alheia (path origem) | ✅ 403 |
| Conta encerrada: depósito/saque/transfer | ✅ 409/422 |
| PATCH limite gerente | ✅ |
| DELETE encerrar conta | ✅ (saga) |

---

## Problemas ainda abertos (fora da suíte ou back-end)

| ID | Descrição | Motivo |
|----|-----------|--------|
| UI-R3 | Saldo negativo em vermelho | Só front-end |
| UI-R8 | Cores entrada/saída no extrato | Só front-end |
| API-R8 | Saldo consolidado por dia sem movimento | `LancamentoExtratoResponse` não tem série diária |
| R12-busca | Campo pesquisa CPF/nome na carteira | Não há query na API `GET /clientes` |
| M6 | Saga explícita R4/R17/R18 via Rabbit | Testes HTTP; NF pede saga — verificar orquestrador |
| M7 | CQRS consistência eventual | Sem teste de atraso |
| M10 | Aprovação 202 vs Swagger 200 | Documentação |
| B5 | CEP inválido no PUT | Não implementado |
| B6 | Cleanup R17 sem assert DELETE | Baixo risco |

---

## Matriz requisito → qualidade do teste (atualizada)

| Req. | Cobertura | Observação |
|------|-----------|------------|
| R1 | ✅ | Autocadastro, falha saga, e-mail duplicado |
| R2 | ✅ | Login, logout revoga token (401 introspect) |
| R3 | ⚠️ | API OK; UI cores não |
| R4 | ✅ | Perfil, limite, piso negativo, gerenteNome, PUT CPF alheio 403 |
| R5 | ✅ | Feliz + ACL + valor inválido |
| R6 | ✅ | Feliz + insuficiente + limite + ACL |
| R7 | ✅ | Feliz + erros + ACL origem |
| R8 | ⚠️ | Lançamentos OK; sem saldo diário; UI cores não |
| R9 | ✅ | Pendentes + filtro `para_aprovar` |
| R10 | ✅ | Saga + limite + gerente mínimo |
| R11 | ✅ | API + e-mail com motivo |
| R12 | ⚠️ | Campos/ordem OK; busca textual não |
| R13 | ✅ | Consulta CPF |
| R14 | ✅ | Top 3 + equivalência rotas |
| R15 | ✅ | Stats campos e ordem |
| R16 | ✅ | Campos, ordem, equivalência report/filtro |
| R17 | ✅ | Origem com mais contas |
| R18 | ✅ | Destino com menos contas + último gerente |
| R19 | ✅ | Listagem completa |
| R20 | ⚠️ | PUT nome/e-mail OK; login com senha do cadastro; troca de senha via saga auth pendente |

---

## Infraestrutura de testes

```powershell
docker compose up -d --build   # após mudanças em gateway/ms-auth/ms-cliente
.\scripts\run-integration-tests.ps1
# opcional: $env:BANTADS_SAGA_WAIT_S = "180"
```

| Variável | Padrão |
|----------|--------|
| `BANTADS_SAGA_WAIT_S` | 120 |
| `BANTADS_GATEWAY` | `http://127.0.0.1` |
| `BANTADS_MAILHOG` | `http://127.0.0.1:8025` |

Reboot manual: `GET http://127.0.0.1/api/integration/reboot`

---

## Conclusão

A suíte cobre **as transações e regras de negócio exigidas no enunciado** no nível HTTP (incluindo ramos de erro que faltavam). Permanecem fora do escopo: **UI**, **saldo consolidado diário no extrato**, **busca na carteira R12** (se não existir na API), e **validação explícita de mensagens Rabbit** nas sagas de perfil/gerente.

Para defesa: rodar a suíte após `docker compose up -d --build`; complementar com demonstração manual/vídeo do front-end.

---

## Documentos relacionados

- [`guia-completo-testes-integracao.md`](guia-completo-testes-integracao.md)
- [`integrationTests.md`](integrationTests.md)
- [`../testReports/corrections/5.18[04-30](auditoria-integracao-reboot-seed)corrections.md`](../testReports/corrections/5.18[04-30](auditoria-integracao-reboot-seed)corrections.md)
- [`../testReports/corrections/5.18[03-04](lacunas-enunciado-backend)corrections.md`](../testReports/corrections/5.18[03-04](lacunas-enunciado-backend)corrections.md)
