import fastifyHttpProxy from '@fastify/http-proxy'
import { applyLegacyUpstreamRewrite, isDacLegacyRoutesEnabled } from './dac-legacy-routes.js'

/**
 * Proxies legados (testador DAC) registrados antes do catch-all do Angular.
 * JWT/ACL usam `request.gatewayApiPath`; o preHandler alinha o upstream quando necessário.
 */
export async function registerDacLegacyProxies (fastify, { upstreams, apiProxyReplyOptions, integrationReboot }) {
  if (!isDacLegacyRoutesEnabled()) return

  const withUpstreamRewrite = (apiPrefix, registerProxy) =>
    fastify.register(async (scope) => {
      scope.addHook('preHandler', async (request) => {
        if (request.gatewayApiPath?.startsWith(apiPrefix)) {
          applyLegacyUpstreamRewrite(request)
        }
      })
      await registerProxy(scope)
    })

  await fastify.register(fastifyHttpProxy, {
    upstream: upstreams.auth,
    prefix: '/login',
    rewritePrefix: '/auth/login',
    replyOptions: apiProxyReplyOptions,
  })

  await fastify.register(fastifyHttpProxy, {
    upstream: upstreams.auth,
    prefix: '/logout',
    rewritePrefix: '/auth/logout',
    replyOptions: apiProxyReplyOptions,
  })

  fastify.get('/reboot', async (request, reply) => {
    const profile = typeof request.query?.profile === 'string' ? request.query.profile : 'full'
    try {
      return await integrationReboot(upstreams, profile)
    } catch (err) {
      request.log.error({ err }, 'reboot legado falhou')
      return reply.code(503).send({ error: err.message ?? 'reboot indisponível' })
    }
  })

  await withUpstreamRewrite('/api/clientes', async (scope) => {
    await scope.register(fastifyHttpProxy, {
      upstream: upstreams.cliente,
      prefix: '/clientes',
      rewritePrefix: '/clientes',
      replyOptions: apiProxyReplyOptions,
    })
  })

  await withUpstreamRewrite('/api/gerentes', async (scope) => {
    await scope.register(fastifyHttpProxy, {
      upstream: upstreams.gerente,
      prefix: '/gerentes',
      rewritePrefix: '/gerentes',
      replyOptions: apiProxyReplyOptions,
    })
  })

  await withUpstreamRewrite('/api/contas', async (scope) => {
    await scope.register(fastifyHttpProxy, {
      upstream: upstreams.conta,
      prefix: '/contas',
      rewritePrefix: '/contas',
      replyOptions: apiProxyReplyOptions,
    })
  })
}
