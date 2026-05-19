package bantads.conta.messaging

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.amqp.rabbit.annotation.RabbitListener
import org.springframework.stereotype.Component
import java.util.concurrent.CompletableFuture
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit
import java.util.concurrent.TimeoutException

@Component
class TransferSagaResponseAwaiter(
    private val objectMapper: ObjectMapper,
) {
    private val log = LoggerFactory.getLogger(javaClass)
    private val pendentes = ConcurrentHashMap<String, CompletableFuture<JsonNode>>()

    fun await(correlationId: String, timeoutSeconds: Long): JsonNode {
        val future = CompletableFuture<JsonNode>()
        pendentes[correlationId] = future
        return try {
            future.get(timeoutSeconds, TimeUnit.SECONDS)
        } catch (ex: TimeoutException) {
            pendentes.remove(correlationId)
            throw IllegalStateException("Timeout aguardando resposta da saga de transferência")
        } catch (ex: Exception) {
            pendentes.remove(correlationId)
            throw IllegalStateException(ex.message ?: "Falha na saga de transferência")
        }
    }

    @RabbitListener(queues = ["conta.internal.responses"], containerFactory = "rawJsonListenerContainerFactory")
    fun onResponse(body: String) {
        val root = objectMapper.readTree(body)
        val corr = root.path("correlationId").asText()
        if (corr.isBlank()) return
        val intent = root.path("intent").asText()
        if (!intent.startsWith("TRANSFER")) return
        pendentes.remove(corr)?.complete(root)
            ?: log.debug("Resposta transfer sem awaiter corr={}", corr)
    }
}
