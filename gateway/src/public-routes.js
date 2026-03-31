/**
 * Rotas públicas (sem Authorization) — alinhado ao Swagger / R1 autocadastro.
 * Demais /api/* exigem Bearer válido.
 */
export function isPublicApiRoute(method, pathname) {
  const p = pathname.replace(/\/$/, '') || '/'

  if (method === 'POST' && p === '/api/auth/login') return true
  if (method === 'GET' && p === '/api/auth/reboot') return true
  // R1 autocadastro — POST /clientes sem autenticação
  if (method === 'POST' && p === '/api/clientes') return true

  return false
}
