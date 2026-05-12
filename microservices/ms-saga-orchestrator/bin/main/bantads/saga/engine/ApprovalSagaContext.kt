package bantads.saga.engine

import com.fasterxml.jackson.databind.JsonNode
import java.time.Instant

/**
 * Estado volátil da saga de aprovação (memória do orquestrador).
 * Não persistir [plainPassword]; não logar.
 */
internal data class ApprovalSagaContext(
    val sagaId: String,
    val clienteId: String,
    val cpf: String,
    val email: String,
    val nome: String,
    val salario: String,
    val telefone: String,
    val endereco: String,
    val cep: String,
    val cidade: String,
    val estado: String,
    var step: ApprovalStep,
    /** Resposta bruta do ms-gerente até o passo de contagem. */
    var gerentesNode: JsonNode? = null,
    var gerenteId: String? = null,
    var contaId: String? = null,
    var numeroConta: String? = null,
    var plainPassword: String? = null,
    var emailAttempts: Int = 0,
    var pendingCorrelationId: String? = null,
    var contaCriada: Boolean = false,
    var usuarioCriado: Boolean = false,
    val idempotencyKeys: MutableSet<String> = mutableSetOf(),
    /** Correlação -> descrição do passo de compensação ainda pendente. */
    val pendingCompensations: MutableMap<String, String> = mutableMapOf(),
    var compensationStartedAt: Instant? = null,
)

internal fun ApprovalSagaContext.touchIdempotency(key: String): Boolean =
    idempotencyKeys.add(key)
