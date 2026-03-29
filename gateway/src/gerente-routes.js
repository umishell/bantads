/**
 * Rotas que exigem JWT com perfil GERENTE (além de Bearer válido).
 */
export function requiresGerenteProfile(method, pathname) {
  const p = pathname.replace(/\/$/, '') || '/'
  if (method === 'GET' && p === '/api/clientes/pendentes') return true
  if (method === 'POST' && /^\/api\/clientes\/[0-9a-f-]{36}\/(aprovar|rejeitar)$/i.test(p)) return true
  return false
}
