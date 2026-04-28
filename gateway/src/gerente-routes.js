/**
 * Rotas que exigem JWT com perfil GERENTE.
 */
export function requiresGerenteProfile(method, rawPathname) {
  const { p, params } = parsePath(rawPathname)

  // Swagger oficial: GET /clientes com filtros do gerente.
  if (method === 'GET' && p === '/api/clientes') {
    const filtro = params.get('filtro')
    return !filtro || filtro === 'para_aprovar' || filtro === 'melhores_clientes'
  }

  // Swagger oficial: aprovação/rejeição por CPF.
  if (method === 'POST' && /^\/api\/clientes\/\d{11}\/(aprovar|rejeitar)$/i.test(p)) return true

  // Compatibilidade com formato antigo por UUID, caso algum backend ainda use.
  if (method === 'POST' && /^\/api\/clientes\/[0-9a-f-]{36}\/(aprovar|rejeitar)$/i.test(p)) return true

  // Endpoints extras/legados do MS Conta.
  if (method === 'GET' && p === '/api/contas/top3') return true
  if (method === 'PATCH' && /^\/api\/contas\/\d{4}\/limite$/i.test(p)) return true
  if (method === 'DELETE' && /^\/api\/contas\/\d{4}$/i.test(p)) return true

  return false
}

function parsePath(rawPathname) {
  const [path, query = ''] = String(rawPathname || '').split('?')
  return {
    p: path.replace(/\/$/, '') || '/',
    params: new URLSearchParams(query),
  }
}
