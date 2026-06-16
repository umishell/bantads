
export function requiresContaListagemOuTop3(method, pathname) {
  const p = pathname.replace(/\/$/, '') || '/'
  if (method === 'GET' && p === '/api/contas') return true
  if (method === 'GET' && p === '/api/contas/top3') return true
  return false
}
