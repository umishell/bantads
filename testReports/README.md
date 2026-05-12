# Relatórios de testes de integração

Gerados ao rodar a suíte em `scripts/integration/` (ver `scripts/run-integration-tests.ps1` ou `scripts/run-integration-tests.sh`).

| Pasta / arquivo | Conteúdo |
|-----------------|----------|
| `working/junit_<AAAA-MM-DD_HH-mm-ss_UTC>.xml` | Resultado JUnit (CI); o nome repete o carimbo UTC legível. |
| `working/passed-summary_<AAAA-MM-DD_HH-mm-ss_UTC>.md` | Lista do que passou na execução (mesmo carimbo que o `junit`). |
| `issues/agent-feedback_<AAAA-MM-DD_HH-mm-ss_UTC>.md` | **Somente falhas**, com trecho de erro e sugestões para realimentar um agente. |

Os arquivos `.md` incluem no topo uma linha **Quando (UTC)** (ex.: `2026-05-12 às 00:46:54 UTC`) além do identificador usado no nome do arquivo.

Variáveis de ambiente úteis (os padrões abaixo coincidem com `scripts/integration/conftest.py`; uso de **`127.0.0.1`** força IPv4 e costuma evitar falhas intermitentes de DNS com `localhost` no Windows):

- `BANTADS_GATEWAY` — URL base do gateway (padrão **`http://127.0.0.1`**, porta **80** implícita no Docker Compose).
- `BANTADS_MAILHOG` — MailHog API (padrão **`http://127.0.0.1:8025`**).
- `BANTADS_RABBITMQ_API` — Management plugin (padrão **`http://127.0.0.1:15672`**).
- `BANTADS_SAGA_WAIT_S` — tempo máximo aguardando saga (padrão `120`).
- `BANTADS_REPORT_STAMP` — opcional; os scripts `run-integration-tests.*` definem automaticamente (ex.: `2026-05-12_14-30-00_UTC`) para o nome do `junit` e dos `.md` coincidirem.
- `RABBITMQ_USER` / `RABBITMQ_PASSWORD` — se não for `guest`/`guest`.

Pré-requisito: `docker compose up` com gateway, microsserviços, RabbitMQ e MailHog ativos.
