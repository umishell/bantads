package bantads.auth.messaging

import bantads.auth.config.RabbitConfig
import bantads.auth.service.AuthService
import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.amqp.rabbit.annotation.RabbitListener
import org.springframework.stereotype.Component

@Component
class AuthCommandListener(
    private val authService: AuthService,
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
                "AUTH_CREATE_CLIENTE" -> {
                    val email = root.path("email").asText()
                    val nome = root.path("nome").asText()
                    val cpf = root.path("cpf").asText()
                    val r = authService.criarClienteParaSaga(email, nome, cpf)
                    if (!r.criado || r.plainPassword.isNullOrBlank()) {
                        responses.publish(
                            "resp.auth",
                            mapOf(
                                "correlationId" to correlationId,
                                "sagaId" to sagaId,
                                "success" to false,
                                "source" to "AUTH",
                                "intent" to "CREATE",
                                "error" to "login já existe ou falha ao criar usuário",
                            ),
                        )
                        return
                    }
                    responses.publish(
                        "resp.auth",
                        mapOf(
                            "correlationId" to correlationId,
                            "sagaId" to sagaId,
                            "success" to true,
                            "source" to "AUTH",
                            "intent" to "CREATE",
                            "login" to r.login,
                            "plainPassword" to r.plainPassword,
                        ),
                    )
                }

                "AUTH_DELETE_USER" -> {
                    val login = root.path("login").asText()
                    authService.removerUsuarioPorLogin(login)
                    responses.publish(
                        "resp.auth",
                        mapOf(
                            "correlationId" to correlationId,
                            "sagaId" to sagaId,
                            "success" to true,
                            "source" to "AUTH",
                            "intent" to "DELETE",
                        ),
                    )
                }

                else -> log.warn("Comando auth desconhecido: {}", cmd)
            }
        } catch (ex: Exception) {
            log.warn("Erro no comando auth: {}", ex.message)
            val intent = when (cmd) {
                "AUTH_CREATE_CLIENTE" -> "CREATE"
                "AUTH_DELETE_USER" -> "DELETE"
                else -> "UNKNOWN"
            }
            responses.publish(
                "resp.auth",
                mapOf(
                    "correlationId" to correlationId,
                    "sagaId" to sagaId,
                    "success" to false,
                    "source" to "AUTH",
                    "intent" to intent,
                    "error" to (ex.message ?: "erro"),
                ),
            )
        }
    }
}
