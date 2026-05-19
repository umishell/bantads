# Tutor — Testes de integração automatizados (pytest + gateway)

> **Guia completo (todos os testes, o quê e o porquê):** [`guia-completo-testes-integracao.md`](guia-completo-testes-integracao.md)

Este guia explica **passo a passo** como usar a suíte de testes de integração que vive em `scripts/integration/`: ela dispara requisições HTTP reais contra o **API Gateway** (`/api/...`), cobre fluxos síncronos, **SAGA** (RabbitMQ + aprovação/rejeição pelo gerente + MailHog), operações de conta, perfis de cliente/gerente/admin e checagens de ACL (`401`/`403`).

Complementa os tutoriais manuais `swaggerTests.md` e `httpieTests.md` com uma forma **repetível** de validar o sistema inteiro após `docker compose up`.

---

## O que você precisa antes de começar

1. **Python 3.10+** instalado (`python --version`).
2. **Docker Desktop** (ou Docker Engine) com a stack BANTADS **no ar**.
3. Estar na **raiz do repositório** (pasta onde está `docker-compose.yml`).

Serviços relevantes para a suíte (nomes típicos do compose):

- **Gateway** — exposto em `http://127.0.0.1` na porta **80** (mapeamento padrão `80:3000`).
- **RabbitMQ** — broker + UI de gestão em `http://127.0.0.1:15672` (usuário/senha padrão `guest`/`guest`, se você não alterou).
- **MailHog** — UI `http://127.0.0.1:8025` (e-mails da saga de aprovação/rejeição).

---

## Passo 1 — Subir o ambiente

Na raiz do repositório:

```powershell
docker compose up --build -d
```

Aguarde os containers ficarem **running** (na primeira vez pode demorar). Confira:

```powershell
docker compose ps
```

Se o gateway não estiver escutando na porta 80 (por exemplo, conflito de porta), ajuste o mapeamento no `docker-compose.yml` ou use a variável `BANTADS_GATEWAY` (veja o passo 5).

---

## Passo 2 — (Opcional) conferir saúde rápida

No navegador ou com curl:

- `http://127.0.0.1/health` → deve responder com JSON indicando que o gateway está **up**.

Isso não substitui a suíte; só confirma que o host consegue falar com o gateway.

---

## Passo 3 — Instalar dependências Python (primeira vez ou após mudança de `requirements.txt`)

Você **não** precisa fazer isso manualmente se usar os scripts do passo 4 (eles rodam `pip install -r requirements.txt`). Se quiser preparar o ambiente à mão:

```powershell
cd scripts\integration
python -m pip install -r requirements.txt
cd ..\..
```

---

## Passo 4 — Executar toda a suíte de integração

Sempre a partir da **raiz do repositório**.

### Windows (PowerShell)

```powershell
.\scripts\run-integration-tests.ps1
```

### Linux ou macOS (Bash)

```bash
chmod +x scripts/run-integration-tests.sh   # só na primeira vez, se necessário
./scripts/run-integration-tests.sh
```

O que esses scripts fazem:

1. Garantem as pastas `testReports/working/`, `testReports/logs/` (com `junit/`, `pytest/`, `docker/`) e `testReports/issues/`.
2. Entram em `scripts/integration`, instalam dependências (`httpx`, `pytest`).
3. Definem um **ID de leva** e carimbo BRT (`BANTADS_REPORT_BATCH_ID`, `BANTADS_REPORT_STAMP`, ex.: `5.17[18-30]` e `2026-05-17[18-30-42]BRT`) e `PYTHONPATH` para importar o pacote `lib`.
4. Executam `pytest` em `tests/` e gravam JUnit em **`testReports/logs/junit/`**, console em **`testReports/logs/pytest/`**, resumos em **`testReports/working/`**, falhas em **`testReports/issues/`** e, quando aplicável, snapshot Docker em **`testReports/logs/docker/`** — todos com o **mesmo ID de leva** no nome do arquivo.

### Passar argumentos extras ao pytest (Linux/macOS)

Exemplo: rodar só um arquivo e modo verboso:

```bash
./scripts/run-integration-tests.sh -k saga -v
```

No Windows, você pode repetir o mesmo `cd` + `pytest` manualmente se preferir (veja passo 6).

---

## Passo 5 — Variáveis de ambiente (quando mudar porta ou URLs)

| Variável | Padrão no código | Uso |
|----------|------------------|-----|
| `BANTADS_GATEWAY` | `http://127.0.0.1` | Base do gateway (**porta 80** implícita no compose padrão). Use `http://127.0.0.1:8080` se mapear outra porta. |
| `BANTADS_MAILHOG` | `http://127.0.0.1:8025` | API REST do MailHog (leitura de e-mails na saga). |
| `BANTADS_RABBITMQ_API` | `http://127.0.0.1:15672` | RabbitMQ Management (teste de “sinal de vida”). |
| `BANTADS_SAGA_WAIT_S` | `120` | Segundos máximos aguardando estado **APROVADO**/**REJEITADO** e e-mail no MailHog. |
| `BANTADS_REPORT_BATCH_ID` / `BANTADS_REPORT_STAMP` | *(gerados pelos scripts)* | Opcional: alinham todos os artefatos da mesma leva (ex.: `5.17[18-30]`). |
| `BANTADS_DOCKER_LOGS` | `on-fail` | `always`, `on-fail` ou `never` para snapshot em `testReports/logs/docker/`. |
| `RABBITMQ_USER` / `RABBITMQ_PASSWORD` | `guest` / `guest` | Se o compose usar outras credenciais. |

**Windows (PowerShell)** — exemplo com porta customizada no gateway:

```powershell
$env:BANTADS_GATEWAY = "http://127.0.0.1:8080"
.\scripts\run-integration-tests.ps1
```

**Linux/macOS**:

```bash
export BANTADS_GATEWAY=http://127.0.0.1:8080
./scripts/run-integration-tests.sh
```

> **Dica (Windows):** o padrão `http://127.0.0.1` evita alguns problemas de resolução de nome com `localhost`. Se algo falhar com DNS, tente explicitamente `127.0.0.1`.

---

## Passo 6 — (Alternativa) Rodar pytest manualmente

Útil para depurar sem o script:

```powershell
cd scripts\integration
$env:PYTHONPATH = "$PWD"
$names = python -m lib.report_names | ConvertFrom-Json
$env:BANTADS_REPORT_BATCH_ID = $names.batch_id
$env:BANTADS_REPORT_STAMP = $names.stamp
python -m pytest tests -v --tb=short --junitxml=..\..\testReports\logs\junit\$($names.junit)
cd ..\..
```

Sem `BANTADS_REPORT_STAMP`, o `conftest` gera um carimbo na hora: os `.md` terão nome coerente, mas o caminho do `--junitxml` que você passar pode ser outro (recomenda-se usar os nomes de `python -m lib.report_names`).

---

## Passo 7 — Entender os relatórios

Após cada execução do **pytest** (com ou sem falhas de teste), os scripts gravam artefatos em `testReports/`:

| Local | Arquivo (padrão) | Conteúdo |
|-------|------------------|----------|
| `testReports/working/` | `{leva}passed-summary__{carimbo}BRT.md` | Testes que **passaram**. |
| `testReports/logs/junit/` | `{leva}junit__{carimbo}BRT.xml` | Resultado JUnit (CI). |
| `testReports/logs/pytest/` | `{leva}pytest-console__{carimbo}BRT.log` | Saída completa do terminal (inclui `[poll]`). |
| `testReports/logs/docker/` | `{leva}docker-compose__{carimbo}BRT.log` | Últimas linhas dos microserviços (padrão: só se pytest falhar). |
| `testReports/issues/` | `{leva}agent-feedback__{carimbo}BRT.md` | **Falhas** + sugestões para o agente. |

`{leva}` é o ID da execução (ex.: `5.17[18-30]`); `{carimbo}` é o instante BRT (ex.: `2026-05-17[18-30-42]BRT`).

`testReports/working/`, `testReports/logs/`, `testReports/issues/` e `testReports/corrections/` estão no **`.gitignore`** (gerados localmente). Veja `testReports/logs/README.md` e `testReports/README.md`.

---

## Passo 8 — Ordem e escopo dos testes (visão geral)

Os arquivos em `scripts/integration/tests/` seguem prefixo numérico (**50 testes** no total). Detalhe de cada caso: [`guia-completo-testes-integracao.md`](guia-completo-testes-integracao.md).

| Arquivo | Foco |
|---------|------|
| `test_01_gateway_health_auth.py` | Health, login, introspect, logout. |
| `test_02_saga_aprovacao.py` | Saga aprovação + rejeição (MailHog). |
| `test_03_conta_transacoes.py` | Depósito, saque, transferência, extrato, limite, top3. |
| `test_04_cliente_gerente_admin.py` | Perfil, carteira, CRUD gerente, relatórios. |
| `test_06_rabbitmq_management.py` | RabbitMQ Management API. |
| `test_07` … `test_13` | R1, consultas gerente/admin, operações cliente, ACL, R8, lacunas R4/R11/R17/R18. |
| `test_11_acl_perfis.py` | `401`/`403` por perfil (substitui o antigo `test_05`). |
| `test_99_r18_gerente_remocao.py` | **Por último** — último gerente ativo (422). |

---

## Passo 9 — Se algo falhar (checklist curto)

1. **Leia o terminal** — o pytest mostra qual teste quebrou e o assert.
2. **Abra o último** `testReports/issues/*agent-feedback*.md` (ordenar por data no explorador de arquivos).
3. **HTTP 401/403** — confira token e perfil (CLIENTE vs GERENTE vs ADMINISTRADOR); veja `gateway/src/*-routes.js`.
4. **HTTP 500** em rotas que agregam dados (ex.: cliente por CPF) — veja logs: `docker compose logs ms-cliente --tail=100` e serviços upstream (conta, gerente).
5. **Timeout na saga** — RabbitMQ, `ms-saga-orchestrator`, `ms-email`, MailHog; aumente `BANTADS_SAGA_WAIT_S`.
6. **MailHog vazio** — confirme URL `BANTADS_MAILHOG` e se o compose sobe MailHog na porta **8025**.

---

## Passo 10 — Relação com os outros tutores

| Documento | Uso |
|-----------|-----|
| **`tutor/guia-completo-testes-integracao.md`** | Explicação de **cada teste** (o quê, por quê, R1–R20). |
| `tutor/swaggerTests.md` | Passo a passo **manual** no Swagger UI (por fluxo R1–R20). |
| `tutor/httpieTests.md` | Coleção mental / HTTPie contra o **gateway**. |
| **Este arquivo** | Como **rodar** pytest, variáveis e relatórios em `testReports/`. |

---

## Resumo em uma frase

Suba o Docker, na raiz execute `.\scripts\run-integration-tests.ps1` (ou o `.sh`), depois consulte **`testReports/issues/`** (falhas), **`testReports/working/`** (resumo), **`testReports/logs/junit/`**, **`testReports/logs/pytest/`** e **`testReports/logs/docker/`** se precisar dos logs dos containers.
