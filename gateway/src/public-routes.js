/**
 * Rotas públicas (sem Authorization) — alinhado ao Swagger / R1 autocadastro.
 * Demais /api/* exigem Bearer válido.
 */
export function isPublicApiRoute(method, pathname) {
  const p = pathname.replace(/\/$/, '') || '/'

  if (method === 'POST' && p === '/api/auth/login') return true
  if (method === 'GET' && p === '/api/auth/reboot') return true
  if (method === 'GET' && p === '/api/integration/reboot') return true
  // Introspecção valida o Bearer no ms-auth (inclui blacklist pós-logout).
  if (method === 'GET' && p === '/api/auth/introspect') return true
  // R1 autocadastro — POST /clientes sem autenticação (com e sem barra final; evita 302→GET sem Bearer)
  if (method === 'POST' && (p === '/api/clientes' || p === '/api/clientes/')) return true

  // Swagger UI e specs de cada microsserviço (testes locais sem JWT obrigatório)
  if (method === 'GET' && isSwaggerPath(p)) return true

  return false
}

function isSwaggerPath(p) {
  const svcs = ['auth', 'clientes', 'contas', 'gerentes']
  for (const s of svcs) {
    const prefix = `/api/${s}`
    if (p === `${prefix}/swagger-ui.html`) return true
    if (p.startsWith(`${prefix}/swagger-ui/`)) return true
    if (p.startsWith(`${prefix}/v3/api-docs`)) return true
    if (p.startsWith(`${prefix}/webjars/`)) return true
  }
  return false
}
