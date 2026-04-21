import Fastify from 'fastify'
import fastifyHttpProxy from '@fastify/http-proxy'
import fastifyRateLimit from '@fastify/rate-limit'
import { verifyAccessToken } from './jwt.js'
import { isPublicApiRoute } from './public-routes.js'
import { requiresGerenteProfile } from './gerente-routes.js'
import { requiresAdminProfile } from './admin-routes.js'
import { requiresClienteProfile } from './cliente-routes.js'

const JWT_SECRET = process.env.JWT_SECRET || '7a56403163745262704573315a6b3164746b386153646c7a4d31354a726e3230'

const upstreams = {
  auth: process.env.UPSTREAM_AUTH || 'http://ms-auth:8081',
  cliente: process.env.UPSTREAM_CLIENTE || 'http://ms-cliente:8082',
  conta: process.env.UPSTREAM_CONTA || 'http://ms-conta:8083',
  gerente: process.env.UPSTREAM_GERENTE || 'http://ms-gerente:8084',
  saga: process.env.UPSTREAM_SAGA || 'http://ms-saga:8085',
  frontend: process.env.UPSTREAM_FRONTEND || 'http://frontend:4200',
}

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
})

fastify.get('/health', async () => ({ status: 'up', service: 'bantads-gateway' }))

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

  request.gatewayUser = {
    sub: payload.sub,
    tipo: payload.tipo ?? payload.perfil,
    perfil: payload.perfil,
  }

  const perfil = payload.perfil ?? payload.tipo

  if (requiresAdminProfile(request.method, url) && perfil !== 'ADMINISTRADOR') {
    return reply.code(403).send({
      status: 403,
      error: 'Forbidden',
      message: 'Acesso restrito a administradores',
    })
  }

  if (requiresGerenteProfile(request.method, url) && perfil !== 'GERENTE') {
    return reply.code(403).send({
      status: 403,
      error: 'Forbidden',
      message: 'Acesso restrito a gerentes',
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
})

await fastify.register(fastifyHttpProxy, {
  upstream: upstreams.cliente,
  prefix: '/api/clientes',
  rewritePrefix: '/clientes',
})

await fastify.register(fastifyHttpProxy, {
  upstream: upstreams.conta,
  prefix: '/api/contas',
  rewritePrefix: '/contas',
})

await fastify.register(fastifyHttpProxy, {
  upstream: upstreams.gerente,
  prefix: '/api/gerentes',
  rewritePrefix: '/gerentes',
})

await fastify.register(fastifyHttpProxy, {
  upstream: upstreams.saga,
  prefix: '/api/saga',
  rewritePrefix: '/saga',
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
