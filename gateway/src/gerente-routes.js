/**
 * Rotas que exigem JWT com perfil GERENTE (além de Bearer válido).
 *
 * GET /api/clientes/report e GET /api/clientes?filtro=adm_relatorio_clientes ficam para
 * ADMINISTRADOR (admin-routes.js).
 *
 * R9: GET /api/clientes/pendentes
 * R10/R11: POST /api/clientes/{id}/aprovar | /rejeitar
 * R12/R13: GET /api/clientes/{cpf} (11 dígitos)
 * R8: PATCH /api/contas/{numero}/limite e DELETE /api/contas/{numero}
 *
 * R14 top3 e listagem GET /api/contas — ver conta-routes.js (GERENTE ou ADMINISTRADOR).
 */
export function requiresGerenteProfile(method, pathname, query) {
  const p = pathname.replace(/\/$/, '') || '/'
  const filtro = typeof query?.filtro === 'string' ? query.filtro : undefined

  if (method === 'GET' && p === '/api/clientes/report') return false

  if (method === 'GET' && p === '/api/clientes/pendentes') return true

  if (method === 'POST' && /^\/api\/clientes\/[0-9a-f-]{36}\/(aprovar|rejeitar)$/i.test(p)) return true

  if (method === 'GET' && /^\/api\/clientes\/\d{11}$/.test(p)) return true

  if (method === 'GET' && p === '/api/clientes') {
    if (filtro === 'adm_relatorio_clientes') return false
    return true
  }

  if (method === 'PATCH' && /^\/api\/contas\/\d{4}\/limite$/i.test(p)) return true
  if (method === 'DELETE' && /^\/api\/contas\/\d{4}$/i.test(p)) return true
  return false
}
