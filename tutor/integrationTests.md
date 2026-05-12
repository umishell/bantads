# Tutor — Testes de integração automatizados (pytest + gateway)

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

1. Garantem as pastas `testReports/working` e `testReports/issues`.
2. Entram em `scripts/integration`, instalam dependências (`httpx`, `pytest`).
3. Definem um carimbo UTC legível (`BANTADS_REPORT_STAMP`, ex.: `2026-05-12_14-30-00_UTC`) e `PYTHONPATH` para importar o pacote `lib`.
4. Executam `pytest` em `tests/` e gravam **`testReports/working/junit_<carimbo>.xml`** (o mesmo carimbo nos `.md` de resumo e de falhas).

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
| `BANTADS_REPORT_STAMP` | *(gerado pelos scripts)* | Opcional: se definir antes do `pytest` (ex.: `2026-05-12_14-30-05_UTC`), alinha o nome do `junit` com os relatórios `.md`. |
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
$stamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd_HH-mm-ss") + "_UTC"
$env:BANTADS_REPORT_STAMP = $stamp
python -m pytest tests -v --tb=short --junitxml=..\..\testReports\working\junit_$stamp.xml
cd ..\..
```

Sem `BANTADS_REPORT_STAMP`, o `conftest` gera um carimbo na hora: os `.md` terão nome coerente, mas o caminho do `--junitxml` que você passar pode ser outro (recomenda-se usar o mesmo `$stamp` no arquivo JUnit).

---

## Passo 7 — Entender os relatórios (duas pastas)

Após cada execução bem-sucedida do **pytest** (com ou sem falhas de teste), são gerados arquivos sob `testReports/`:

### Pasta `testReports/working/` — “o que funcionou” + JUnit

| Arquivo | Conteúdo |
|---------|-----------|
| `junit_<AAAA-MM-DD_HH-mm-ss_UTC>.xml` | Resultado no formato JUnit (CI); **mesmo sufixo de data/hora** que os `.md` da mesma execução quando você usa os scripts ou define `BANTADS_REPORT_STAMP`. |
| `passed-summary_<AAAA-MM-DD_HH-mm-ss_UTC>.md` | Lista dos testes que **passaram**; no topo há **Quando (UTC)** em texto legível. |

### Pasta `testReports/issues/` — só problemas + dicas para o agente

| Arquivo | Conteúdo |
|---------|-----------|
| `agent-feedback_<AAAA-MM-DD_HH-mm-ss_UTC>.md` | **Apenas falhas**: trecho do erro/traceback e **sugestões** (401, 403, 500, saga, MailHog, rede, etc.) para você **colar de volta em um agente** (ex.: Cursor) e pedir correção guiada. |

As pastas `working/` e `issues/` estão no **`.gitignore`** (geradas na sua máquina). O arquivo `testReports/README.md` no repositório resume as variáveis de ambiente.

---

## Passo 8 — Ordem e escopo dos testes (visão geral)

Os arquivos em `scripts/integration/tests/` seguem prefixo numérico para leitura lógica:

| Arquivo | Foco |
|---------|------|
| `test_01_gateway_health_auth.py` | Health do gateway, login, introspect, logout (com token descartável). |
| `test_02_saga_aprovacao.py` | Autocadastro público → gerente **pendentes** → **aprovar** (202) → espera **APROVADO** + MailHog + login do novo cliente + conta/saldo; fluxo de **rejeição** + e-mail. |
| `test_03_conta_transacoes.py` | Depósito, saque, transferência, extrato, transferência inválida (mesma conta), PATCH limite (gerente), top3 e listagem de contas. |
| `test_04_cliente_gerente_admin.py` | PUT perfil cliente, carteira/filtros gerente, CRUD gerente (admin), relatórios/stats, agregados por gerente. |
| `test_05_gateway_acl.py` | `401` sem Bearer; `403` cliente em rota de gerente. |
| `test_06_rabbitmq_management.py` | GET na API de management do RabbitMQ (sinal de que o broker está acessível). |

---

## Passo 9 — Se algo falhar (checklist curto)

1. **Leia o terminal** — o pytest mostra qual teste quebrou e o assert.
2. **Abra o último** `testReports/issues/agent-feedback-*.md` (ordenar por data no explorador de arquivos).
3. **HTTP 401/403** — confira token e perfil (CLIENTE vs GERENTE vs ADMINISTRADOR); veja `gateway/src/*-routes.js`.
4. **HTTP 500** em rotas que agregam dados (ex.: cliente por CPF) — veja logs: `docker compose logs ms-cliente --tail=100` e serviços upstream (conta, gerente).
5. **Timeout na saga** — RabbitMQ, `ms-saga-orchestrator`, `ms-email`, MailHog; aumente `BANTADS_SAGA_WAIT_S`.
6. **MailHog vazio** — confirme URL `BANTADS_MAILHOG` e se o compose sobe MailHog na porta **8025**.

---

## Passo 10 — Relação com os outros tutores

| Documento | Uso |
|-----------|-----|
| `tutor/swaggerTests.md` | Passo a passo **manual** no Swagger UI (por fluxo R1–R20). |
| `tutor/httpieTests.md` | Coleção mental / HTTPie contra o **gateway**. |
| **Este arquivo** | Automatizar os mesmos tipos de fluxo com **pytest**, relatórios em `testReports/` e scripts em `scripts/`. |

---

## Resumo em uma frase

Suba o Docker, na raiz execute `.\scripts\run-integration-tests.ps1` (ou o `.sh`), depois consulte **`testReports/working/`** para o que passou e **`testReports/issues/agent-feedback-*.md`** para falhas e sugestões de correção.
