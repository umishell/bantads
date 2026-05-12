# Tutorial — Testes transacionais no BANTADS com HTTPie Desktop (2026)

Este guia é para testar, no mesmo estilo do front, todos os endpoints “transacionais” usando **HTTPie Desktop (Windows/Mac/Linux)** e o **API Gateway** do BANTADS.

Ele assume que a stack Docker já está funcional (gateway, microsserviços, bancos, RabbitMQ, MailHog).

---

## 1) Pré-requisitos (mínimos)

1. **Docker Desktop** ligado.
2. Navegador/HTTPie Desktop instalado e funcionando.
3. Banco e microsserviços rodando via Compose.

Na raiz do repositório (onde está `docker-compose.yml`):

```powershell
docker compose up --build -d
```

---

## 2) Criar Space, Collection e Environment no HTTPie Desktop

1. Abra o HTTPie Desktop.
2. Crie/Selecione um **Space** (ex.: “BANTADS”).
3. Crie uma **Collection** (ex.: “Gateway — transacionais”).
4. Crie/edite um **Environment** com estas variáveis:

   - `gateway` = `http://localhost`  
   - `token_cliente` = (vazio inicialmente)
   - `token_gerente` = (vazio inicialmente)
   - `token_admin` = (vazio inicialmente)
   - `clienteId` = (vazio inicialmente, UUID)
   - `cpf_cliente` = (vazio inicialmente, 11 dígitos)
   - `numeroConta` = (vazio inicialmente, 4 dígitos)

Observação: o HTTPie Desktop normalmente não “extrai automaticamente” valores do JSON para variáveis. Você vai copiar/colar manualmente o que for necessário depois de cada resposta.

---

## 3) Como autenticar com Bearer no HTTPie Desktop

Em cada requisição que exige token:

1. No painel **Auth** da requisição:
   - escolha **Bearer token**
   - coloque `{{token_cliente}}` ou `{{token_gerente}}` ou `{{token_admin}}`
2. Envie a requisição.

Dica: para reduzir erro, prefira chamar tudo via `{{gateway}}/api/...` (gateway sempre é o mesmo ponto do app).

---

## 4) Fluxo base: reboot + login (antes de testar qualquer transação)

### 4.1 Health (gateway)

- Método: `GET`
- URL: `{{gateway}}/health`
- Body: vazio
- Esperado: `200 OK`

### 4.2 Seed / reboot (Mongo seed do ms-auth)

- Método: `GET`
- URL: `{{gateway}}/api/auth/reboot`
- Auth: nenhum
- Esperado: `200 OK`

### 4.3 Login — definir token do perfil

#### Login CLIENTE

- Método: `POST`
- URL: `{{gateway}}/api/auth/login`
- Body JSON:
```json
{
  "login": "cli1@bantads.com.br",
  "senha": "tads"
}
```
- Copie `access_token` e cole em `token_cliente`.

#### Login GERENTE

mesma rota:
```json
{
  "login": "ger1@bantads.com.br",
  "senha": "tads"
}
```
- Copie `access_token` e cole em `token_gerente`.

#### Login ADMINISTRADOR

mesma rota:
```json
{
  "login": "adm1@bantads.com.br",
  "senha": "tads"
}
```
- Copie `access_token` e cole em `token_admin`.

---

## 5) R1 — Autocadastro (público) e saga de aprovação (GERENTE)

### 5.1 Autocadastro (público, Gateway)

- Método: `POST`
- URL: `{{gateway}}/api/clientes`
- Auth: nenhum
- Body JSON:
```json
{
  "cpf": "52998224725",
  "email": "novocliente.desktop@example.com",
  "nome": "Fulano da Silva",
  "telefone": "41999998888",
  "salario": 5000.00,
  "endereco": "Rua das Flores 100",
  "CEP": "80010000",
  "cidade": "Curitiba",
  "estado": "PR"
}
```
- Esperado: `201 Created`

Na resposta, copie:
- `clienteId` (UUID) -> cole em `clienteId`
- `cpf` -> cole em `cpf_cliente`

> Se der erro de CPF/email duplicado, altere o `email` e/ou use outro CPF válido.

### 5.2 Listar pendentes (GERENTE)

- Método: `GET`
- URL: `{{gateway}}/api/clientes/pendentes`
- Auth: Bearer `{{token_gerente}}`
- Esperado: `200 OK`
- Confirme que existe o cliente pendente criado na 5.1.

### 5.3 Aprovar (GERENTE) — inicia saga

- Método: `POST`
- URL: `{{gateway}}/api/clientes/{{clienteId}}/aprovar`
- Auth: Bearer `{{token_gerente}}`
- Body: `{}` ou vazio (se o Swagger aceitar body opcional)
- Esperado: `202 Accepted`

### 5.4 Acompanhar resultado (assíncrono)

Enquanto a saga roda:
- ver filas e consumo em **RabbitMQ Management**: `http://localhost:15672`
- e-mails em **MailHog**: `http://localhost:8025`

Quando concluir, o cliente deve aparecer como aprovado (e a conta passa a existir no ms-conta).

---

## 6) R12/R13/R4 — Consultar e alterar perfil (CLIENTE)

### 6.1 Consultar detalhe do cliente por CPF (CLIENTE)

- Método: `GET`
- URL: `{{gateway}}/api/clientes/{{cpf_cliente}}`
- Auth: Bearer `{{token_cliente}}` (ACL do gateway)
- Esperado: `200 OK`

### 6.2 Alterar perfil do cliente (CLIENTE) — (R4)

- Método: `PUT`
- URL: `{{gateway}}/api/clientes/{{cpf_cliente}}`
- Auth: Bearer `{{token_cliente}}`
- Body JSON (campos opcionais, envie o que quiser alterar):
```json
{
  "nome": "Fulano da Silva (editado)",
  "email": "fulano.editado@example.com",
  "telefone": "41998887766",
  "salario": 2500.00,
  "endereco": "Rua X, 50",
  "cidade": "Curitiba",
  "estado": "PR",
  "cep": "80000000"
}
```
- Esperado: `200 OK`

> Depois valide o efeito em `ms-conta` via `GET /api/contas/{numero}/saldo`, usando o `numeroConta` do cliente (próximo passo).

---

## 7) R3/R5/R6/R7/R8 — Depósito, saque, transferência, saldo e extrato (CLIENTE)

### 7.1 Obter `numeroConta` do CLIENTE (para usar nos próximos endpoints)

Opções:

- via detalhe do cliente (se retornar conta, depende do contrato no seu ambiente), ou
- via consulta de conta no gateway/microsserviço.

Para o seu workflow, faça:
1. `GET {{gateway}}/api/clientes/{{cpf_cliente}}` (se a resposta incluir número de conta)
2. se não incluir, use:
   - `GET {{gateway}}/api/clientes/{{cpf_cliente}}` para confirmar os dados
   - e depois `ms-conta` para listar por cliente (quando você souber o `clienteId`)

Assim que tiver `numeroConta` (4 dígitos), continue.

### 7.2 Depósito

- Método: `POST`
- URL: `{{gateway}}/api/contas/{{numeroConta}}/depositar`
- Auth: Bearer `{{token_cliente}}`
- Body JSON:
```json
{ "valor": 51.44 }
```
- Esperado: `200 OK`

### 7.3 Saque

- Método: `POST`
- URL: `{{gateway}}/api/contas/{{numeroConta}}/sacar`
- Auth: Bearer `{{token_cliente}}`
- Body JSON:
```json
{ "valor": 51.44 }
```
- Esperado: `200 OK`

### 7.4 Transferência

- Método: `POST`
- URL: `{{gateway}}/api/contas/{{numeroConta}}/transferir`
- Auth: Bearer `{{token_cliente}}`
- Body JSON (destino deve ter 4 dígitos e não pode ser a própria conta):
```json
{
  "numeroContaDestino": "0123",
  "valor": 51.44
}
```

> Observação: no front o payload usa `destino`; no serviço a DTO chama `numeroContaDestino`. No gateway, os DTOs do contrato do app precisam estar compatíveis. Se você receber erro de validação, verifique o campo correto no Swagger do `ms-conta`.

### 7.5 Saldo

- Método: `GET`
- URL: `{{gateway}}/api/contas/{{numeroConta}}/saldo`
- Auth: Bearer `{{token_cliente}}`
- Esperado: `200 OK`

### 7.6 Extrato

- Método: `GET`
- URL: `{{gateway}}/api/contas/{{numeroConta}}/extrato?dataInicio=2025-01-01&dataFim=2025-12-31`
- Auth: Bearer `{{token_cliente}}`
- Esperado: `200 OK`

Confirme que:
- depósitos entram como “entrada”
- saques/transferências entram como “saída”

---

## 8) R9/R10/R11 — Pendentes, aprovar e rejeitar (GERENTE)

### 8.1 Pendentes

- `GET {{gateway}}/api/clientes/pendentes`
- Auth: Bearer `{{token_gerente}}`
- Esperado: `200 OK`

### 8.2 Aprovar (iniciar saga)

- `POST {{gateway}}/api/clientes/{{clienteId}}/aprovar`
- Auth: Bearer `{{token_gerente}}`
- Body: `{}` ou vazio
- Esperado: `202 Accepted`

### 8.3 Rejeitar (opcional)

Para rejeitar um cliente pendente:

- `POST {{gateway}}/api/clientes/{{clienteId}}/rejeitar`
- Auth: Bearer `{{token_gerente}}`
- Body JSON:
```json
{ "motivo": "Usuário não é interessante para o banco" }
```
- Esperado: `200 OK`

---

## 9) R19/R15/R16/R17/R18/R20 — Gerentes e operações de ADMIN

### 9.1 Listar gerentes (R19)

- Método: `GET`
- URL: `{{gateway}}/api/gerentes`
- Auth: Bearer `{{token_admin}}`
- Esperado: `200 OK`

### 9.2 Dashboard admin (R15)

- Método: `GET`
- URL: `{{gateway}}/api/gerentes/stats`
- Auth: Bearer `{{token_admin}}`
- Esperado: `200 OK`

### 9.3 Relatório de clientes (R16)

- Método: `GET`
- URL: `{{gateway}}/api/clientes/report`
- Auth: Bearer `{{token_admin}}`
- Esperado: `200 OK`

### 9.4 Inserir gerente (R17)

- Método: `POST`
- URL: `{{gateway}}/api/gerentes`
- Auth: Bearer `{{token_admin}}`
- Body JSON:
```json
{
  "cpf": "40501740066",
  "nome": "Gerente HTTPie",
  "email": "gerente.httpie@example.com",
  "telefone": "41990000000",
  "senha": "tads",
  "tipo": "GERENTE"
}
```
- Esperado: `201 Created`

### 9.5 Alterar gerente (R20)

- Método: `PUT`
- URL: `{{gateway}}/api/gerentes/{{cpf_novo_gerente}}`
- Auth: Bearer `{{token_admin}}`
- Body JSON (nome/email/senha):
```json
{
  "nome": "Gerente HTTPie (editado)",
  "email": "gerente.httpie.editado@example.com",
  "senha": "tads"
}
```
- Esperado: `200 OK`

### 9.6 Remover gerente (R18)

- Método: `DELETE`
- URL: `{{gateway}}/api/gerentes/{{cpf_gerente_para_remover}}`
- Auth: Bearer `{{token_admin}}`
- Esperado: `200 OK`  

> Regra: não remover o último gerente ativo (pode retornar erro).

---

## 10) Dicas finais (para evitar retrabalho)

- Sempre que mudar token/perfil, re-pegue o Bearer e substitua `{{token_cliente}}` / `{{token_gerente}}` / `{{token_admin}}`.
- Para endpoints assíncronos (saga de autocadastro/aprovacao), espere o e-mail chegar/estado mudar antes de validar extrato/saldo.
- Se algum endpoint acusar erro de validação:
  - verifique o campo correto do JSON no Swagger do `ms-` (porque o contrato do front pode ter nomes diferentes dos DTOs internos).

---

## 11) Próximo passo sugerido

Use junto com:
- `tutor/fluxos-transacionais-do-app-para-testes-swagger.md`

para você montar “evidências de teste” por fluxo: request, response, e efeito no banco/RabbitMQ/MailHog.

