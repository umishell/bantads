# BANTADS — Rotas funcionais e credenciais do protótipo

## Importante

- Este pacote está em **cache de memória do front-end**, sem integração com banco/gateway.
- **Não use F5**. O estado permanece enquanto a aplicação não é recarregada.
- O botão **Sair** nas telas de cliente e gerente preserva o cache em memória e permite trocar de usuário sem perder as movimentações já feitas.

## Logins de cliente

- `cli1@bantads.com.br` / `tads` → Catharyna → conta `1291`
- `cli2@bantads.com.br` / `tads` → Cleuddônio → conta `0950`
- `cli3@bantads.com.br` / `tads` → Catianna → conta `8573`
- `cli4@bantads.com.br` / `tads` → Cutardo → conta `5887`
- `cli5@bantads.com.br` / `tads` → Coândrya → conta `7617`

## Logins de gerente

- `ger1@bantads.com.br` / `tads` → Geniéve
- `ger2@bantads.com.br` / `tads` → Godophredo
- `ger3@bantads.com.br` / `tads` → Gyândula

## Login de administrador disponível no mock

- `adm1@bantads.com.br` / `tads` → Adamântio

## Rotas funcionais atuais

### Públicas

- `/auth/login`
- `/auth/autocadastro`

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

## Fluxo para o vídeo do cliente

1. Login com `cli1@bantads.com.br`
2. Fazer depósito
3. Fazer saque
4. Fazer transferência para `0950`
5. Clicar em **Sair**
6. Login com `cli2@bantads.com.br`
7. Mostrar saldo/home/extrato alterados
8. Clicar em **Sair**
9. Voltar para `cli1@bantads.com.br`
10. Alterar perfil e emitir extrato em PDF

## Fluxo sugerido para o vídeo do gerente

1. Login com `ger1@bantads.com.br`
2. Mostrar a tela inicial com pendências
3. Aprovar um cliente e mostrar conta/senha temporária geradas
4. Ir em **Clientes** e mostrar que o cliente entrou na carteira
5. Usar **Consultar cliente** por CPF
6. Ir em **Top 3 clientes**
