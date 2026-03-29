package bantads.saga.engine

import bantads.saga.config.SagaProperties
import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.amqp.rabbit.core.RabbitTemplate
import org.springframework.stereotype.Service
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

@Service
class SagaOrchestrator(
    private val rabbitTemplate: RabbitTemplate,
    private val objectMapper: ObjectMapper,
    private val props: SagaProperties,
) {
    private val log = LoggerFactory.getLogger(javaClass)
    private val sessions = ConcurrentHashMap<String, ApprovalSagaContext>()
    private val locks = ConcurrentHashMap<String, Any>()

    private fun lock(sagaId: String): Any = locks.computeIfAbsent(sagaId) { Any() }

    fun onClienteEventJson(json: String) {
        val root = objectMapper.readTree(json)
        val type = root.path("eventType").asText()
        when (type) {
            "CLIENTE_PENDENTE_CRIADO" -> log.info(
                "Saga recebeu cadastro pendente sagaId={} clienteId={}",
                root.path("sagaId").asText(),
                root.path("clienteId").asText(),
            )

            "CLIENTE_APROVACAO_INICIADA" -> startApproval(root)
            "CLIENTE_REJEITADO" -> forwardRejeicaoEmail(root)
            else -> log.warn("Evento cliente desconhecido: {}", type)
        }
    }

    fun onServiceResponseJson(json: String) {
        val root = objectMapper.readTree(json)
        val sagaId = root.path("sagaId").asText()
        if (sagaId.isBlank()) return
        synchronized(lock(sagaId)) {
            val ctx = sessions[sagaId] ?: run {
                log.debug("Resposta sem sessão ativa sagaId={}", sagaId)
                return
            }
            val corr = root.path("correlationId").asText()
            if (ctx.pendingCorrelationId != null && corr != ctx.pendingCorrelationId) {
                log.warn("Correlation mismatch sagaId={} esperado={} recebido={}", sagaId, ctx.pendingCorrelationId, corr)
                return
            }
            val ok = root.path("success").asBoolean()
            if (!ok) {
                handleFailure(ctx, root)
                return
            }
            val source = root.path("source").asText()
            val intent = root.path("intent").asText()
            when (source) {
                "GERENTE" -> onGerenteListOk(ctx, root)
                "CONTA" -> when (intent) {
                    "COUNTS" -> onContaCountsOk(ctx, root)
                    "CREATE" -> onContaCreateOk(ctx, root)
                    else -> log.warn("CONTA intent inesperado: {}", intent)
                }

                "AUTH" -> when (intent) {
                    "CREATE" -> onAuthCreateOk(ctx, root)
                    else -> log.warn("AUTH intent inesperado: {}", intent)
                }

                "EMAIL" -> when (intent) {
                    "SEND" -> onEmailOk(ctx)
                    else -> log.warn("EMAIL intent inesperado: {}", intent)
                }

                else -> log.warn("Source desconhecida: {}", source)
            }
        }
    }

    private fun startApproval(root: JsonNode) {
        val sagaId = root.path("sagaId").asText()
        if (sagaId.isBlank()) return
        synchronized(lock(sagaId)) {
            if (sessions.containsKey(sagaId)) {
                log.info("Saga aprovação já em curso (idempotência) sagaId={}", sagaId)
                return
            }
            val salNode = root["salario"]
            val salStr = when {
                salNode == null || salNode.isNull -> ""
                salNode.isTextual -> salNode.asText()
                salNode.isNumber -> salNode.decimalValue().toPlainString()
                else -> salNode.asText()
            }
            val ctx = ApprovalSagaContext(
                sagaId = sagaId,
                clienteId = root.path("clienteId").asText(),
                cpf = root.path("cpf").asText(),
                email = root.path("email").asText(),
                nome = root.path("nome").asText(),
                salario = salStr,
                telefone = root.path("telefone").asText(),
                endereco = root.path("endereco").asText(),
                cep = root.path("cep").asText(),
                cidade = root.path("cidade").asText(),
                estado = root.path("estado").asText(),
                step = ApprovalStep.AWAIT_GERENTE_LIST,
            )
            sessions[sagaId] = ctx
            sendGerenteList(ctx)
        }
    }

    private fun forwardRejeicaoEmail(root: JsonNode) {
        val corr = root.path("correlationId").asText().ifBlank { UUID.randomUUID().toString() }
        val sagaId = root.path("sagaId").asText().ifBlank { UUID.randomUUID().toString() }
        val payload = mapOf(
            "command" to "EMAIL_REJEICAO_CADASTRO",
            "correlationId" to corr,
            "sagaId" to sagaId,
            "email" to root.path("email").asText(),
            "nome" to root.path("nome").asText(),
            "motivo" to root.path("motivo").asText(),
        )
        send("cmd.email", payload)
        log.info("Encaminhado e-mail de rejeição sagaId={} destino={}", sagaId, root.path("email").asText())
    }

    private fun sendGerenteList(ctx: ApprovalSagaContext) {
        val corr = UUID.randomUUID().toString()
        ctx.pendingCorrelationId = corr
        ctx.step = ApprovalStep.AWAIT_GERENTE_LIST
        send(
            "cmd.gerente",
            mapOf(
                "command" to "GERENTE_LIST_ATIVOS",
                "correlationId" to corr,
                "sagaId" to ctx.sagaId,
                "clienteId" to ctx.clienteId,
            ),
        )
    }

    private fun onGerenteListOk(ctx: ApprovalSagaContext, root: JsonNode) {
        val arr = root["gerentes"] ?: return handleFailure(ctx, root, "resposta gerente sem array")
        if (!arr.isArray || arr.size() == 0) return handleFailure(ctx, root, "nenhum gerente ativo")
        ctx.gerentesNode = arr
        val ids = arr.map { it["id"].asText() }.filter { it.isNotBlank() }
        val corr = UUID.randomUUID().toString()
        ctx.pendingCorrelationId = corr
        ctx.step = ApprovalStep.AWAIT_COUNTS
        send(
            "cmd.conta",
            mapOf(
                "command" to "CONTA_COUNTS_BY_GERENTE",
                "correlationId" to corr,
                "sagaId" to ctx.sagaId,
                "gerenteIds" to ids,
            ),
        )
    }

    private fun onContaCountsOk(ctx: ApprovalSagaContext, root: JsonNode) {
        val gerentes = ctx.gerentesNode ?: return handleFailure(ctx, root, "estado inválido sem gerentes")
        val countsNode = root["counts"] ?: return handleFailure(ctx, root, "counts ausente")
        val counts = mutableMapOf<String, Long>()
        countsNode.fields().forEach { (k, v) -> counts[k] = v.asLong() }
        val picked = pickGerente(gerentes, counts) ?: return handleFailure(ctx, root, "falha ao escolher gerente")
        ctx.gerenteId = picked
        val key = "CONTA_CREATE:${ctx.sagaId}"
        if (!ctx.touchIdempotency(key)) {
            log.info("CONTA_CREATE idempotente ignorado sagaId={}", ctx.sagaId)
            return
        }
        val corr = UUID.randomUUID().toString()
        ctx.pendingCorrelationId = corr
        ctx.step = ApprovalStep.AWAIT_CONTA_CREATE
        send(
            "cmd.conta",
            mapOf(
                "command" to "CONTA_CREATE",
                "correlationId" to corr,
                "sagaId" to ctx.sagaId,
                "clienteId" to ctx.clienteId,
                "gerenteId" to picked,
                "salario" to ctx.salario,
                "cpf" to ctx.cpf,
                "nome" to ctx.nome,
            ),
        )
    }

    private fun pickGerente(gerentes: JsonNode, counts: Map<String, Long>): String? {
        data class Row(val id: String, val cpf: String, val c: Long)
        val rows = mutableListOf<Row>()
        for (n in gerentes) {
            val id = n.path("id").asText()
            if (id.isBlank()) continue
            val cpf = n.path("cpf").asText()
            rows += Row(id, cpf, counts[id] ?: 0L)
        }
        if (rows.isEmpty()) return null
        return rows.minWith(compareBy<Row>({ it.c }).thenBy { it.cpf }).id
    }

    private fun onContaCreateOk(ctx: ApprovalSagaContext, root: JsonNode) {
        ctx.contaId = root.path("contaId").asText()
        ctx.numeroConta = root.path("numero").asText()
        ctx.contaCriada = true
        val corr = UUID.randomUUID().toString()
        ctx.pendingCorrelationId = corr
        ctx.step = ApprovalStep.AWAIT_AUTH
        send(
            "cmd.auth",
            mapOf(
                "command" to "AUTH_CREATE_CLIENTE",
                "correlationId" to corr,
                "sagaId" to ctx.sagaId,
                "email" to ctx.email,
                "nome" to ctx.nome,
                "cpf" to ctx.cpf,
            ),
        )
    }

    private fun onAuthCreateOk(ctx: ApprovalSagaContext, root: JsonNode) {
        val pwd = root.path("plainPassword").asText()
        if (pwd.isBlank()) return handleFailure(ctx, root, "auth sem senha")
        ctx.plainPassword = pwd
        ctx.usuarioCriado = true
        sendEmail(ctx, pwd)
    }

    private fun sendEmail(ctx: ApprovalSagaContext, plainPassword: String) {
        val corr = UUID.randomUUID().toString()
        ctx.pendingCorrelationId = corr
        ctx.step = ApprovalStep.AWAIT_EMAIL
        ctx.emailAttempts++
        val payload = mapOf(
            "command" to "EMAIL_SEND_CREDENTIALS",
            "correlationId" to corr,
            "sagaId" to ctx.sagaId,
            "email" to ctx.email,
            "nome" to ctx.nome,
            "plainPassword" to plainPassword,
            "login" to ctx.email,
            "numeroConta" to ctx.numeroConta.orEmpty(),
        )
        send("cmd.email", payload)
        log.info("Publicado envio de e-mail (tentativa {}/{}) sagaId={}", ctx.emailAttempts, props.emailMaxAttempts, ctx.sagaId)
    }

    private fun onEmailOk(ctx: ApprovalSagaContext) {
        val corr = UUID.randomUUID().toString()
        ctx.pendingCorrelationId = corr
        ctx.step = ApprovalStep.DONE
        send(
            "cmd.cliente",
            mapOf(
                "command" to "CLIENTE_MARCAR_APROVADO",
                "correlationId" to corr,
                "sagaId" to ctx.sagaId,
                "clienteId" to ctx.clienteId,
            ),
        )
        sessions.remove(ctx.sagaId)
        log.info("Saga concluída com sucesso sagaId={}", ctx.sagaId)
    }

    private fun handleFailure(ctx: ApprovalSagaContext, root: JsonNode) {
        val msg = root.path("error").asText().ifBlank { "erro desconhecido" }
        handleFailure(ctx, root, msg)
    }

    private fun handleFailure(ctx: ApprovalSagaContext, root: JsonNode?, message: String) {
        val source = root?.path("source")?.asText().orEmpty()
        val intent = root?.path("intent")?.asText().orEmpty()
        if (source == "EMAIL" && intent == "SEND" && ctx.step == ApprovalStep.AWAIT_EMAIL &&
            ctx.emailAttempts < props.emailMaxAttempts
        ) {
            val pwd = ctx.plainPassword
            if (!pwd.isNullOrBlank()) {
                log.warn("Falha no e-mail, retry sagaId={}: {}", ctx.sagaId, message)
                sendEmail(ctx, pwd)
                return
            }
        }
        log.warn("Falha terminal na saga sagaId={}: {}", ctx.sagaId, message)
        compensateAndResetCliente(ctx)
    }

    private fun compensateAndResetCliente(ctx: ApprovalSagaContext) {
        val corrBase = UUID.randomUUID().toString()
        if (ctx.usuarioCriado) {
            send(
                "cmd.auth",
                mapOf(
                    "command" to "AUTH_DELETE_USER",
                    "correlationId" to "$corrBase-auth",
                    "sagaId" to ctx.sagaId,
                    "login" to ctx.email,
                ),
            )
        }
        if (ctx.contaCriada) {
            val contaId = ctx.contaId
            if (!contaId.isNullOrBlank()) {
                send(
                    "cmd.conta",
                    mapOf(
                        "command" to "CONTA_DELETE",
                        "correlationId" to "$corrBase-conta",
                        "sagaId" to ctx.sagaId,
                        "contaId" to contaId,
                    ),
                )
            }
        }
        send(
            "cmd.cliente",
            mapOf(
                "command" to "CLIENTE_MARCAR_PENDENTE",
                "correlationId" to "$corrBase-cliente",
                "sagaId" to ctx.sagaId,
                "clienteId" to ctx.clienteId,
                "motivo" to "Falha no fluxo de aprovação; reabra a aprovação.",
            ),
        )
        sessions.remove(ctx.sagaId)
        log.info("Compensação enfileirada e cliente revertido para pendente sagaId={}", ctx.sagaId)
    }

    private fun send(queue: String, body: Map<String, Any?>) {
        rabbitTemplate.convertAndSend("", queue, body)
    }
}
