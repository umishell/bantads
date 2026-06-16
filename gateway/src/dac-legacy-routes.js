/**
 * Compatibilidade com o testador oficial DAC (`test_dac_bantads.py`):
 * rotas “flat” em http://localhost/login, /clientes, … → /api/…
 */

const LEGACY_RESOURCE_PREFIXES = ['/clientes', '/gerentes', '/contas']

export function normalizePathname (pathname) {
  return pathname.replace(/\/$/, '') || '/'
}

/**
 * @returns {string|null} caminho /api/… ou null se não for rota legada da DAC
 */
export function resolveDacLegacyPath (method, pathname) {
  const p = normalizePathname(pathname)
  const m = method.toUpperCase()

  if (m === 'POST' && p === '/login') return '/api/auth/login'
  if (m === 'POST' && p === '/logout') return '/api/auth/logout'
  if (m === 'GET' && p === '/reboot') return '/api/integration/reboot'

  for (const prefix of LEGACY_RESOURCE_PREFIXES) {
    if (p === prefix) return `/api${prefix}`
    if (p.startsWith(`${prefix}/`)) return `/api${p}`
  }

  return null
}

export function isCpfAprovarRejeitarPath (pathname) {
  return /^\/api\/clientes\/\d{11}\/(aprovar|rejeitar)$/.test(normalizePathname(pathname))
}

/**
 * Testes DAC usam CPF em /clientes/{cpf}/aprovar; ms-cliente espera UUID.
 */
export async function resolveCpfToUuidAprovarRejeitar (pathname, clienteUpstream) {
  const p = normalizePathname(pathname)
  const match = p.match(/^\/api\/clientes\/(\d{11})\/(aprovar|rejeitar)$/)
  if (!match) return null

  const [, cpf, action] = match
  const res = await fetch(`${clienteUpstream.replace(/\/$/, '')}/clientes/${cpf}`)
  if (!res.ok) return null

  const body = await res.json()
  const id = body?.id
  if (typeof id !== 'string' || !id) return null

  return `/api/clientes/${id}/${action}`
}

/** Caminho /api/… usado por JWT, ACL e rewrite de upstream nos proxies legados. */
export async function resolveGatewayApiPath (request, clienteUpstream) {
  let pathname = normalizePathname(request.url.split('?')[0])

  if (isDacLegacyRoutesEnabled() && !pathname.startsWith('/api')) {
    const legacy = resolveDacLegacyPath(request.method, pathname)
    if (legacy) pathname = legacy
  }

  if (isDacLegacyRoutesEnabled() && isCpfAprovarRejeitarPath(pathname)) {
    const uuidPath = await resolveCpfToUuidAprovarRejeitar(pathname, clienteUpstream)
    if (uuidPath) pathname = uuidPath
  }

  return pathname
}

/** Ajusta URL enviada ao microsserviço quando o path público legado difere do canônico. */
export function applyLegacyUpstreamRewrite (request) {
  const apiPath = request.gatewayApiPath
  if (typeof apiPath !== 'string' || !apiPath.startsWith('/api/')) return

  const qs = request.url.includes('?') ? request.url.slice(request.url.indexOf('?')) : ''
  const bareApi = normalizePathname(apiPath)
  let upstreamPath = bareApi.replace(/^\/api/, '')

  // Spring exige barra final em POST na raiz do context-path (evita 302→GET).
  if (request.method === 'POST' && (bareApi === '/api/clientes' || bareApi === '/api/gerentes')) {
    upstreamPath += '/'
  }

  request.raw.url = upstreamPath + qs
}

export function isDacLegacyRoutesEnabled () {
  return process.env.DAC_LEGACY_ROUTES !== '0'
}

export function isGatewayApiRoute (pathname) {
  return pathname.startsWith('/api')
}
