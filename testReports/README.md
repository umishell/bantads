# Relatórios de testes de integração

Artefatos gerados ao rodar `scripts/run-integration-tests.ps1` ou `scripts/run-integration-tests.sh`.

| Pasta | Conteúdo |
|-------|----------|
| [`working/`](working/) | Resumos do que passou (`passed-summary`) |
| [`logs/`](logs/) | Subpastas de artefatos técnicos (abaixo) |
| [`logs/junit/`](logs/junit/) | JUnit XML por leva |
| [`logs/pytest/`](logs/pytest/) | Saída completa do terminal (pytest + `[poll]`) |
| [`logs/docker/`](logs/docker/) | Snapshots `docker compose logs` por leva |
| [`issues/`](issues/) | Falhas + sugestões para o agente (`agent-feedback`) |
| [`corrections/`](corrections/) | Correções anotadas manualmente |

Todos os arquivos de uma mesma execução usam o **mesmo ID de leva** (ex.: `5.17[18-30]`) no nome do arquivo.

Documentação detalhada: [`logs/README.md`](logs/README.md).
