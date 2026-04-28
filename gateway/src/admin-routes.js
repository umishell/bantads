/**
 * Rotas que exigem JWT com perfil ADMINISTRADOR.
 */
export function requiresAdminProfile(method, rawPathname) {
  const { p, params } = parsePath(rawPathname)

  // Swagger oficial: GET /clientes?filtro=adm_relatorio_clientes
  if (method === 'GET' && p === '/api/clientes' && params.get('filtro') === 'adm_relatorio_clientes') {
    return true
  }

  // Swagger oficial: GET /gerentes e GET /gerentes?numero=dashboard
  if (method === 'GET' && p === '/api/gerentes') return true
  if (method === 'GET' && /^\/api\/gerentes\/\d{11}$/i.test(p)) return true
  if (method === 'POST' && p === '/api/gerentes') return true
  if (method === 'PUT' && /^\/api\/gerentes\/\d{11}$/i.test(p)) return true
  if (method === 'DELETE' && /^\/api\/gerentes\/\d{11}$/i.test(p)) return true

  // Compatibilidade com endpoints antigos já existentes no projeto.
  if (method === 'GET' && p === '/api/gerentes/stats') return true
  if (method === 'GET' && p === '/api/clientes/report') return true

  return false
}

function parsePath(rawPathname) {
  const [path, query = ''] = String(rawPathname || '').split('?')
  return {
    p: path.replace(/\/$/, '') || '/',
    params: new URLSearchParams(query),
  }
}
