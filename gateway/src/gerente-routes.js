/**
 * Rotas que exigem JWT com perfil GERENTE (além de Bearer válido).
 *
 * R9: GET /api/clientes/pendentes
 * R10/R11: POST /api/clientes/{id}/aprovar | /rejeitar
 * R12/R13: GET /api/clientes e GET /api/clientes/{cpf}
 * R14: GET /api/contas/top3
 * R8: PATCH /api/contas/{numero}/limite e DELETE /api/contas/{numero}
 */
export function requiresGerenteProfile(method, pathname) {
  const p = pathname.replace(/\/$/, '') || '/'
  if (method === 'GET' && p === '/api/clientes/pendentes') return true
  if (method === 'POST' && /^\/api\/clientes\/[0-9a-f-]{36}\/(aprovar|rejeitar)$/i.test(p)) return true
  if (method === 'GET' && /^\/api\/clientes(\/[^/]+)?$/i.test(p)) return true
  if (method === 'GET' && p === '/api/contas/top3') return true
  if (method === 'PATCH' && /^\/api\/contas\/\d{4}\/limite$/i.test(p)) return true
  if (method === 'DELETE' && /^\/api\/contas\/\d{4}$/i.test(p)) return true
  return false
}
