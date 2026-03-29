import Fastify from 'fastify'
import fastifyHttpProxy from '@fastify/http-proxy'
import { verifyAccessToken } from './jwt.js'
import { isPublicApiRoute } from './public-routes.js'
import { requiresGerenteProfile } from './gerente-routes.js'

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

  if (requiresGerenteProfile(request.method, url)) {
    const perfil = payload.perfil ?? payload.tipo
    if (perfil !== 'GERENTE') {
      return reply.code(403).send({
        status: 403,
        error: 'Forbidden',
        message: 'Acesso restrito a gerentes',
      })
    }
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
