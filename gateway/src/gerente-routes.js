export function requiresGerenteProfile(method, pathname, query) {
  const p = pathname.replace(/\/$/, '') || '/'
  const filtro = typeof query?.filtro === 'string' ? query.filtro : undefined

  if (method === 'GET' && p === '/api/clientes/report') return false

  if (method === 'GET' && p === '/api/clientes/pendentes') return true

  if (method === 'POST' && /^\/api\/clientes\/(\d{11}|[0-9a-f-]{36})\/(aprovar|rejeitar)$/i.test(p)) return true

  if (method === 'GET' && /^\/api\/clientes\/\d{11}$/.test(p)) return true

  if (method === 'GET' && p === '/api/clientes') {
    if (filtro === 'adm_relatorio_clientes') return false
    return true
  }

  if (method === 'PATCH' && /^\/api\/contas\/\d{4}\/limite$/i.test(p)) return true
  if (method === 'DELETE' && /^\/api\/contas\/\d{4}$/i.test(p)) return true
  return false
}
