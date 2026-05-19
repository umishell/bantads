/**
 * R5/R6/R7 — cliente só opera na própria conta (número no path).
 * R4 — cliente só altera o próprio CPF no PUT /api/clientes/{cpf}.
 */

const CONTA_OP = /^\/api\/contas\/(\d{4})\/(depositar|sacar|transferir)$/i
const CLIENTE_PUT = /^\/api\/clientes\/(\d{11})$/i

export function extractContaNumero(pathname) {
  const m = pathname.replace(/\/$/, '').match(CONTA_OP)
  return m ? m[1] : null
}

export function extractClienteCpfPut(pathname) {
  const m = pathname.replace(/\/$/, '').match(CLIENTE_PUT)
  return m ? m[1] : null
}

export function isClienteContaMutation(method, pathname) {
  return method === 'POST' && CONTA_OP.test(pathname.replace(/\/$/, '') || '/')
}

export function isClientePerfilPut(method, pathname) {
  return method === 'PUT' && CLIENTE_PUT.test(pathname.replace(/\/$/, '') || '/')
}

/**
 * @returns {Promise<boolean|null>} true se dono; false se não; null se deixar upstream decidir (conta não encontrada)
 */
export async function clientePossuiConta(upstreams, cpf, numero) {
  if (!cpf || !numero) return false
  const contaRes = await fetch(`${upstreams.conta}/contas/${numero}`)
  if (contaRes.status === 404) return null
  if (!contaRes.ok) return false
  const conta = await contaRes.json()
  const cliRes = await fetch(`${upstreams.cliente}/clientes/${cpf}`)
  if (!cliRes.ok) return false
  const cli = await cliRes.json()
  return String(conta.clienteId) === String(cli.id)
}
