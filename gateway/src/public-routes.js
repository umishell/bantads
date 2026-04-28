/**
 * Rotas públicas sem Authorization.
 *
 * Formato externo oficial, usado pelo frontend:
 * - POST /api/login
 * - GET  /api/reboot
 * - POST /api/clientes
 *
 * Mantemos também /api/auth/login e /api/auth/reboot por compatibilidade local.
 */
export function isPublicApiRoute(method, rawPathname) {
  const { p } = parsePath(rawPathname)

  if (method === 'POST' && p === '/api/login') return true
  if (method === 'GET' && p === '/api/reboot') return true

  if (method === 'POST' && p === '/api/auth/login') return true
  if (method === 'GET' && p === '/api/auth/reboot') return true

  // R1 autocadastro público.
  if (method === 'POST' && p === '/api/clientes') return true

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

function parsePath(rawPathname) {
  const [path] = String(rawPathname || '').split('?')
  return { p: path.replace(/\/$/, '') || '/' }
}
