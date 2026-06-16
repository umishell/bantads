export function requiresClienteProfile(method, pathname) {
  const p = pathname.replace(/\/$/, '') || '/'
  if (method === 'POST' && /^\/api\/contas\/\d{4}\/(depositar|sacar|transferir)$/i.test(p)) return true
  if (method === 'GET' && /^\/api\/contas\/\d{4}\/(saldo|extrato)$/i.test(p)) return true
  if (method === 'GET' && /^\/api\/contas\/\d{4}$/i.test(p)) return true
  if (method === 'GET' && /^\/api\/contas\/por-cliente\/[0-9a-f-]{36}$/i.test(p)) return true
  if (method === 'PUT' && /^\/api\/clientes\/\d{11}$/i.test(p)) return true
  return false
}
