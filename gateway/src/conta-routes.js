/**
 * Rotas de consulta em /api/contas que exigem backoffice (GERENTE ou ADMINISTRADOR),
 * mas não o perfil CLIENTE.
 *
 * - GET /api/contas — listagem (R7/R8)
 * - GET /api/contas/top3 — R14 (gerente ou admin)
 */

export function requiresContaListagemOuTop3(method, pathname) {
  const p = pathname.replace(/\/$/, '') || '/'
  if (method === 'GET' && p === '/api/contas') return true
  if (method === 'GET' && p === '/api/contas/top3') return true
  return false
}
