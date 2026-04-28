/**
 * Rotas que exigem JWT com perfil CLIENTE.
 */
export function requiresClienteProfile(method, rawPathname) {
  const { p } = parsePath(rawPathname)

  // R4: alteração de perfil do próprio cliente.
  if (method === 'PUT' && /^\/api\/clientes\/\d{11}$/i.test(p)) return true

  // R5/R6/R7/R8: operações e consultas de conta.
  if (method === 'GET' && /^\/api\/contas\/\d{4}\/(saldo|extrato)$/i.test(p)) return true
  if (method === 'POST' && /^\/api\/contas\/\d{4}\/(depositar|sacar|transferir)$/i.test(p)) return true

  return false
}

function parsePath(rawPathname) {
  const [path] = String(rawPathname || '').split('?')
  return { p: path.replace(/\/$/, '') || '/' }
}
