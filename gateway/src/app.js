import Fastify from 'fastify'
import fastifyHttpProxy from '@fastify/http-proxy'
import fastifyRateLimit from '@fastify/rate-limit'
import { verifyAccessToken } from './jwt.js'
import { isPublicApiRoute } from './public-routes.js'
import { requiresGerenteProfile } from './gerente-routes.js'
import { requiresAdminProfile } from './admin-routes.js'
import { requiresClienteProfile } from './cliente-routes.js'
import { requiresContaListagemOuTop3 } from './conta-routes.js'
import { integrationReboot } from './integration-reboot.js'
import {
  clientePossuiConta,
  extractClienteCpfPut,
  extractContaNumero,
  isClienteContaMutation,
  isClientePerfilPut,
} from './conta-cliente-guard.js'

const JWT_SECRET = process.env.JWT_SECRET || '7a56403163745262704573315a6b3164746b386153646c7a4d31354a726e3230'

const upstreams = {
  auth: process.env.UPSTREAM_AUTH || 'http://ms-auth:8081',
  cliente: process.env.UPSTREAM_CLIENTE || 'http://ms-cliente:8082',
  conta: process.env.UPSTREAM_CONTA || 'http://ms-conta:8083',
  gerente: process.env.UPSTREAM_GERENTE || 'http://ms-gerente:8084',
  saga: process.env.UPSTREAM_SAGA || 'http://ms-saga:8085',
  frontend: process.env.UPSTREAM_FRONTEND || 'http://frontend:4200',
}

/** Location absoluto com hostname Docker quebra clientes no host (getaddrinfo). */
function rewriteDockerInternalLocation (headers, req) {
  const loc = headers.location
  if (typeof loc !== 'string' || (!loc.startsWith('http://') && !loc.startsWith('https://'))) {
    return headers
  }
  const host = req.headers.host || '127.0.0.1'
  const proto = String(req.headers['x-forwarded-proto'] ?? 'http').split(',')[0].trim() || 'http'
  const mappings = [
    [new URL(upstreams.auth).origin + '/auth', `${proto}://${host}/api/auth`],
    [new URL(upstreams.cliente).origin + '/clientes', `${proto}://${host}/api/clientes`],
    [new URL(upstreams.conta).origin + '/contas', `${proto}://${host}/api/contas`],
    [new URL(upstreams.gerente).origin + '/gerentes', `${proto}://${host}/api/gerentes`],
    [new URL(upstreams.saga).origin + '/saga', `${proto}://${host}/api/saga`],
  ]
  for (const [internalPrefix, publicPrefix] of mappings) {
    if (loc.startsWith(internalPrefix)) {
      headers.location = publicPrefix + loc.slice(internalPrefix.length)
      break
    }
  }
  return headers
}

const apiProxyReplyOptions = {
  rewriteHeaders: (headers, req) => rewriteDockerInternalLocation(headers, req),
}

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
})

/**
 * CORS manual: @fastify/cors registra OPTIONS em /* e quebra ao registrar o proxy em /.
 * Angular em :4200 + API em :80 precisa de preflight sem conflito de rotas.
 */
fastify.addHook('onRequest', async (request, reply) => {
  const origin = request.headers.origin
  if (origin) {
    reply.header('Access-Control-Allow-Origin', origin)
    reply.header('Access-Control-Allow-Credentials', 'true')
    reply.header('Vary', 'Origin')
  } else {
    reply.header('Access-Control-Allow-Origin', '*')
  }
  reply.header(
    'Access-Control-Allow-Methods',
    'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS',
  )
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept')
  reply.header('Access-Control-Expose-Headers', 'Content-Type')
})

fastify.get('/health', async () => ({ status: 'up', service: 'bantads-gateway' }))

/** Reset PG + Mongo para pytest (perfil `full` ou `single-gerente`). */
fastify.get('/api/integration/reboot', async (request) => {
  const profile = typeof request.query?.profile === 'string' ? request.query.profile : 'full'
  return integrationReboot(upstreams, profile)
})

/** Landing com links para o Swagger UI de cada microsserviço (testes locais). */
fastify.get('/docs', async (_request, reply) => {
  reply.type('text/html').send(`<!doctype html>
<html lang="pt-br">
<head>
  <meta charset="utf-8"/>
  <title>BANTADS — API Docs</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 40px auto; max-width: 760px; color: #222; }
    h1 { margin-bottom: 4px; }
    p.lead { color: #555; margin-top: 0; }
    ul { list-style: none; padding: 0; }
    li { margin: 10px 0; padding: 14px 16px; background: #f5f7fb; border-radius: 8px; }
    a { color: #0b66c3; text-decoration: none; font-weight: 600; }
    a:hover { text-decoration: underline; }
    small { color: #666; display: block; margin-top: 6px; font-weight: 400; }
    code { background: #eef2f7; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
  </style>
</head>
<body>
  <h1>BANTADS — Swagger UIs</h1>
  <p class="lead">Cada microsserviço expõe seu próprio OpenAPI. Use o botão <b>Authorize</b> do Swagger para colar o <code>access_token</code> obtido em <code>POST /auth/login</code>.</p>
  <ul>
    <li><a href="http://localhost:8081/auth/swagger-ui.html" target="_blank">ms-auth</a><small>Login, logout, introspect e reboot (MongoDB). Porta 8081, context-path <code>/auth</code>.</small></li>
    <li><a href="http://localhost:8082/clientes/swagger-ui.html" target="_blank">ms-cliente</a><small>Autocadastro (R1), pendentes (R9), aprovar (R10) / rejeitar (R11). Porta 8082.</small></li>
    <li><a href="http://localhost:8083/contas/swagger-ui.html" target="_blank">ms-conta</a><small>Operações de conta (R3), extrato (R5), saldo (R6), consulta (R7), top 3 (R14), agregados (R15). Porta 8083.</small></li>
    <li><a href="http://localhost:8084/gerentes/swagger-ui.html" target="_blank">ms-gerente</a><small>CRUD de gerentes (R17-R20) e dashboard do administrador (R15). Porta 8084.</small></li>
  </ul>
  <p><small>Dica: os endpoints <code>/api/*</code> que você vê no gateway (<code>http://localhost/api/…</code>) passam pelo middleware de JWT. Os Swagger UIs acima vão direto no serviço, sem o gateway, para facilitar debug. Em ambos os casos, chame <code>POST http://localhost/api/auth/login</code> primeiro para obter o token e cole em "Authorize".</small></p>
  <p><small>RabbitMQ UI: <a href="http://localhost:15672" target="_blank">http://localhost:15672</a> (usuário/senha <code>guest/guest</code> por padrão) · MailHog: <a href="http://localhost:8025" target="_blank">http://localhost:8025</a></small></p>
</body>
</html>`)
})

await fastify.register(fastifyRateLimit, {
  global: false,
  keyGenerator: (request) => request.ip,
  errorResponseBuilder: (_request, context) => ({
    status: 429,
    error: 'Too Many Requests',
    message: `Limite de tentativas de login excedido. Tente novamente em ${Math.ceil(context.ttl / 1000)}s.`,
  }),
})

/** R2: brute-force protection para /api/auth/login antes do proxy. */
const loginRateLimit = {
  max: Number(process.env.LOGIN_RATE_LIMIT_MAX || 10),
  timeWindow: Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || 60_000),
}

fastify.addHook('onRequest', async (request, reply) => {
  const url = request.url.split('?')[0]
  if (request.method === 'POST' && url === '/api/auth/login') {
    await fastify.rateLimit({
      max: loginRateLimit.max,
      timeWindow: loginRateLimit.timeWindow,
    })(request, reply)
  }
})

/** R2: exige JWT nas rotas /api protegidas */
fastify.addHook('onRequest', async (request, reply) => {
  const url = request.url.split('?')[0]
  if (!url.startsWith('/api')) return

  /** Preflight CORS: não exigir Bearer (evita 401 sem Access-Control-*). */
  if (request.method === 'OPTIONS') {
    return reply.code(204).send()
  }

  if (isPublicApiRoute(request.method, url)) return

  const auth = request.headers.authorization
  if (!auth || !auth.toLowerCase().startsWith('bearer ')) {
    return reply.code(401).send({
      status: 401,
      error: 'Unauthorized',
      message: 'Authorization Bearer obrigatório para este recurso',
    })
  }

  const raw = auth.slice(7).trim()
  const payload = verifyAccessToken(raw, JWT_SECRET)
  if (!payload) {
    return reply.code(401).send({
      status: 401,
      error: 'Unauthorized',
      message: 'Token inválido ou expirado',
    })
  }

  let cpfClaim = payload.cpf ?? null
  const perfilClaim = payload.perfil ?? payload.tipo
  if (!cpfClaim && perfilClaim === 'CLIENTE') {
    try {
      const intro = await fetch(`${upstreams.auth}/auth/introspect`, {
        headers: { Authorization: auth },
      })
      if (intro.ok) {
        const body = await intro.json()
        cpfClaim = body.cpf ?? null
      }
    } catch {
      cpfClaim = null
    }
  }

  request.gatewayUser = {
    sub: payload.sub,
    tipo: payload.tipo ?? payload.perfil,
    perfil: payload.perfil,
    cpf: cpfClaim,
  }

  const perfil = payload.perfil ?? payload.tipo
  const pathOnly = url.replace(/\/$/, '') || '/'

  if (perfil === 'CLIENTE') {
    if (isClientePerfilPut(request.method, pathOnly)) {
      const cpfPath = extractClienteCpfPut(pathOnly)
      const cpfToken = request.gatewayUser.cpf
      if (cpfToken && cpfPath && cpfPath !== cpfToken) {
        return reply.code(403).send({
          status: 403,
          error: 'Forbidden',
          message: 'Cliente só pode alterar o próprio perfil',
        })
      }
    }
    if (isClienteContaMutation(request.method, pathOnly)) {
      const numero = extractContaNumero(pathOnly)
      const cpfToken = request.gatewayUser.cpf
      if (!cpfToken) {
        return reply.code(403).send({
          status: 403,
          error: 'Forbidden',
          message: 'Token sem CPF do cliente',
        })
      }
      const owns = await clientePossuiConta(upstreams, cpfToken, numero)
      if (owns === false) {
        return reply.code(403).send({
          status: 403,
          error: 'Forbidden',
          message: 'Operação permitida apenas na conta do cliente autenticado',
        })
      }
    }
  }
  const query = request.query ?? {}

  if (requiresAdminProfile(request.method, url, query) && perfil !== 'ADMINISTRADOR') {
    return reply.code(403).send({
      status: 403,
      error: 'Forbidden',
      message: 'Acesso restrito a administradores',
    })
  }

  if (requiresGerenteProfile(request.method, url, query) && perfil !== 'GERENTE') {
    const ownCpfGet =
      request.method === 'GET' &&
      /^\/api\/clientes\/\d{11}$/.test(pathOnly) &&
      perfil === 'CLIENTE' &&
      request.gatewayUser.cpf === pathOnly.slice('/api/clientes/'.length)
    if (!ownCpfGet) {
      return reply.code(403).send({
        status: 403,
        error: 'Forbidden',
        message: 'Acesso restrito a gerentes',
      })
    }
  }

  if (
    requiresContaListagemOuTop3(request.method, url) &&
    perfil !== 'GERENTE' &&
    perfil !== 'ADMINISTRADOR'
  ) {
    return reply.code(403).send({
      status: 403,
      error: 'Forbidden',
      message: 'Acesso restrito a gerentes ou administradores',
    })
  }

  if (requiresClienteProfile(request.method, url) && perfil !== 'CLIENTE') {
    return reply.code(403).send({
      status: 403,
      error: 'Forbidden',
      message: 'Acesso restrito a clientes',
    })
  }
})

await fastify.register(fastifyHttpProxy, {
  upstream: upstreams.auth,
  prefix: '/api/auth',
  rewritePrefix: '/auth',
  replyOptions: apiProxyReplyOptions,
})

await fastify.register(fastifyHttpProxy, {
  upstream: upstreams.cliente,
  prefix: '/api/clientes',
  rewritePrefix: '/clientes',
  replyOptions: apiProxyReplyOptions,
})

await fastify.register(fastifyHttpProxy, {
  upstream: upstreams.conta,
  prefix: '/api/contas',
  rewritePrefix: '/contas',
  replyOptions: apiProxyReplyOptions,
})

await fastify.register(fastifyHttpProxy, {
  upstream: upstreams.gerente,
  prefix: '/api/gerentes',
  rewritePrefix: '/gerentes',
  replyOptions: apiProxyReplyOptions,
})

await fastify.register(fastifyHttpProxy, {
  upstream: upstreams.saga,
  prefix: '/api/saga',
  rewritePrefix: '/saga',
  replyOptions: apiProxyReplyOptions,
})

/** Frontend Angular — tudo que não começa com /api */
await fastify.register(fastifyHttpProxy, {
  upstream: upstreams.frontend,
  prefix: '/',
  rewritePrefix: '/',
  replyOptions: {
    rewriteRequestHeaders: (request, headers) => {
      headers.host = new URL(upstreams.frontend).host
      return headers
    },
  },
})

const port = Number(process.env.PORT || 3000)
const host = process.env.HOST || '0.0.0.0'

try {
  await fastify.listen({ port, host })
  fastify.log.info(`Gateway em http://${host}:${port}`)
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
