export function requiresAdminProfile(method, pathname, query) {
  const p = pathname.replace(/\/$/, '') || '/'
  const filtro = typeof query?.filtro === 'string' ? query.filtro : undefined

  if (method === 'GET' && p === '/api/gerentes') return true
  if (method === 'GET' && p === '/api/gerentes/stats') return true
  if (method === 'GET' && /^\/api\/gerentes\/\d{11}$/i.test(p)) return true
  if (method === 'POST' && p === '/api/gerentes') return true
  if (method === 'PUT' && /^\/api\/gerentes\/\d{11}$/i.test(p)) return true
  if (method === 'DELETE' && /^\/api\/gerentes\/\d{11}$/i.test(p)) return true
  if (method === 'GET' && p === '/api/clientes/report') return true
  if (method === 'GET' && p === '/api/clientes' && filtro === 'adm_relatorio_clientes') return true
  if (method === 'GET' && p === '/api/contas/agregados/por-gerente') return true
  return false
}
