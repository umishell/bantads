export function isPublicApiRoute(method, pathname) {
  const p = pathname.replace(/\/$/, '') || '/'

  if (method === 'POST' && p === '/api/auth/login') return true
  if (method === 'GET' && p === '/api/auth/reboot') return true
  if (method === 'GET' && p === '/api/integration/reboot') return true

  if (method === 'GET' && p === '/api/auth/introspect') return true

  if (method === 'POST' && (p === '/api/clientes' || p === '/api/clientes/')) return true

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
