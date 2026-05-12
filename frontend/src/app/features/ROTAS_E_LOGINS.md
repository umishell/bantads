# BANTADS — Rotas e credenciais (gateway + microsserviços)

## Importante

- O front fala com o **API Gateway** (`http://localhost/api` no Compose; ver `frontend/src/app/core/config/api-base.ts`).
- Dados vêm dos microsserviços (**ms-auth**, **ms-cliente**, **ms-conta**, etc.), não de cache em memória no Angular.

## Rotas públicas

- `/auth/login`
- `/auth/autocadastro` — `POST /api/clientes` (R1)

## Logins (seed no Mongo / ms-auth — ver scripts ou README do ms-auth)

Use os usuários criados no ambiente integrado (ex.: e-mails de teste do projeto). Senha típica de desenvolvimento costuma ser a documentada no ms-auth ou `docker-compose`.

## Rotas por perfil

### Cliente

- `/cliente/home`
- `/cliente/deposito`
- `/cliente/saque`
- `/cliente/transferencia`
- `/cliente/extrato`
- `/cliente/perfil`

### Gerente

- `/gerente/home`
- `/gerente/clientes`
- `/gerente/consulta`
- `/gerente/melhores-clientes`

### Administrador

- `/admin/home`
- `/admin/gerentes`
- `/admin/relatorio-clientes`

## Fluxo sugerido (cliente)

1. Login com usuário **CLIENTE** aprovado (conta criada no ms-conta).
2. Depósito / saque / transferência (conta destino: **4 dígitos**).
3. Extrato e perfil (`PUT /api/clientes/{cpf}`).

## Fluxo sugerido (gerente)

1. Login **GERENTE**.
2. Pendentes em `/gerente/home` — aprovar/rejeitar por **UUID** do cliente.
3. Carteira e consultas.
