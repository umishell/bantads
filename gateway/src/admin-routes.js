/**
 * Rotas que exigem JWT com perfil ADMINISTRADOR.
 *
 * R15: GET /api/gerentes/stats
 * R16: GET /api/clientes/report
 * R17: POST /api/gerentes
 * R18: DELETE /api/gerentes/{cpf}
 * R19: GET /api/gerentes
 * R20: PUT /api/gerentes/{cpf}
 */
export function requiresAdminProfile(method, pathname) {
  const p = pathname.replace(/\/$/, '') || '/'
  if (method === 'GET' && p === '/api/gerentes') return true
  if (method === 'GET' && p === '/api/gerentes/stats') return true
  if (method === 'GET' && /^\/api\/gerentes\/\d{11}$/i.test(p)) return true
  if (method === 'POST' && p === '/api/gerentes') return true
  if (method === 'PUT' && /^\/api\/gerentes\/\d{11}$/i.test(p)) return true
  if (method === 'DELETE' && /^\/api\/gerentes\/\d{11}$/i.test(p)) return true
  if (method === 'GET' && p === '/api/clientes/report') return true
  return false
}
