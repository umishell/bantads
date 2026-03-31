package bantads.gerente.messaging

import bantads.gerente.config.RabbitConfig
import bantads.gerente.repository.GerenteRepository
import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.amqp.rabbit.annotation.RabbitListener
import org.springframework.stereotype.Component

@Component
class GerenteCommandListener(
    private val repository: GerenteRepository,
    private val responses: SagaResponsePublisher,
    private val objectMapper: ObjectMapper,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @RabbitListener(queues = [RabbitConfig.QUEUE_CMD], containerFactory = "rawJsonListenerContainerFactory")
    fun onMessage(body: String) {
        val root = objectMapper.readTree(body)
        val cmd = root.path("command").asText()
        val correlationId = root.path("correlationId").asText()
        val sagaId = root.path("sagaId").asText()
        try {
            when (cmd) {
                "GERENTE_LIST_ATIVOS" -> {
                    val list = repository.findAllByAtivoTrueOrderByCpfAsc().map { g ->
                        mapOf(
                            "id" to (g.id?.toString() ?: ""),
                            "cpf" to g.cpf,
                            "nome" to g.nome,
                        )
                    }
                    responses.publish(
                        "resp.gerente",
                        mapOf(
                            "correlationId" to correlationId,
                            "sagaId" to sagaId,
                            "success" to true,
                            "source" to "GERENTE",
                            "intent" to "LIST",
                            "gerentes" to list,
                        ),
                    )
                }

                else -> log.warn("Comando gerente desconhecido: {}", cmd)
            }
        } catch (ex: Exception) {
            log.warn("Erro comando gerente: {}", ex.message)
            responses.publish(
                "resp.gerente",
                mapOf(
                    "correlationId" to correlationId,
                    "sagaId" to sagaId,
                    "success" to false,
                    "source" to "GERENTE",
                    "intent" to "LIST",
                    "error" to (ex.message ?: "erro"),
                ),
            )
        }
    }
}
