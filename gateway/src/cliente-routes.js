/**
 * Rotas que exigem JWT com perfil CLIENTE.
 *
 * R3: operações de conta do próprio cliente — POST /api/contas/{numero}/depositar|sacar|transferir
 * R5: GET /api/contas/{numero}/extrato
 * R6: GET /api/contas/{numero}/saldo
 * R7: GET /api/contas/{numero} ; GET /api/contas/por-cliente/{id}
 *
 * Observação: a verificação fina (se a conta pertence ao próprio cliente) acontece
 * no microsserviço ms-conta; o gateway impõe apenas o perfil correto.
 */
export function requiresClienteProfile(method, pathname) {
  const p = pathname.replace(/\/$/, '') || '/'
  if (method === 'POST' && /^\/api\/contas\/\d{4}\/(depositar|sacar|transferir)$/i.test(p)) return true
  if (method === 'GET' && /^\/api\/contas\/\d{4}\/(saldo|extrato)$/i.test(p)) return true
  if (method === 'GET' && /^\/api\/contas\/\d{4}$/i.test(p)) return true
  if (method === 'GET' && /^\/api\/contas\/por-cliente\/[0-9a-f-]{36}$/i.test(p)) return true
  return false
}
