package bantads.email.messaging

import bantads.email.config.RabbitConfig
import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.amqp.rabbit.annotation.RabbitListener
import org.springframework.beans.factory.annotation.Value
import org.springframework.mail.SimpleMailMessage
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.stereotype.Component

@Component
class EmailCommandListener(
    private val mailSender: JavaMailSender,
    private val responses: SagaResponsePublisher,
    private val objectMapper: ObjectMapper,
    @Value("\${bantads.mail.from}") private val from: String,
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
                "EMAIL_SEND_CREDENTIALS" -> sendCredentials(root, correlationId, sagaId)
                "EMAIL_REJEICAO_CADASTRO" -> sendRejeicao(root, correlationId, sagaId)
                else -> log.warn("Comando e-mail desconhecido: {}", cmd)
            }
        } catch (ex: Exception) {
            log.warn("Falha ao enviar e-mail (sem detalhar corpo): {}", ex.message)
            responses.publish(
                "resp.email",
                mapOf(
                    "correlationId" to correlationId,
                    "sagaId" to sagaId,
                    "success" to false,
                    "source" to "EMAIL",
                    "intent" to if (cmd == "EMAIL_REJEICAO_CADASTRO") "REJEICAO" else "SEND",
                    "error" to (ex.message ?: "erro"),
                ),
            )
        }
    }

    private fun sendCredentials(root: com.fasterxml.jackson.databind.JsonNode, correlationId: String, sagaId: String) {
        val to = root.path("email").asText()
        val nome = root.path("nome").asText()
        val login = root.path("login").asText()
        val numeroConta = root.path("numeroConta").asText()
        val plainPassword = root.path("plainPassword").asText()
        val msg = SimpleMailMessage()
        msg.from = from
        msg.setTo(to)
        msg.subject = "BANTADS — sua conta foi aprovada"
        msg.text = buildString {
            appendLine("Olá, $nome.")
            appendLine("Seu cadastro foi aprovado.")
            appendLine("Login: $login")
            appendLine("Senha provisória: $plainPassword")
            if (numeroConta.isNotBlank()) appendLine("Conta (4 dígitos): $numeroConta")
            appendLine("Altere a senha após o primeiro acesso.")
        }
        mailSender.send(msg)
        log.info("E-mail de credenciais enviado sagaId={} destino={}", sagaId, to)
        responses.publish(
            "resp.email",
            mapOf(
                "correlationId" to correlationId,
                "sagaId" to sagaId,
                "success" to true,
                "source" to "EMAIL",
                "intent" to "SEND",
            ),
        )
    }

    private fun sendRejeicao(root: com.fasterxml.jackson.databind.JsonNode, correlationId: String, sagaId: String) {
        val to = root.path("email").asText()
        val nome = root.path("nome").asText()
        val motivo = root.path("motivo").asText()
        val msg = SimpleMailMessage()
        msg.from = from
        msg.setTo(to)
        msg.subject = "BANTADS — cadastro não aprovado"
        msg.text = "Olá, $nome.\nInfelizmente seu cadastro não foi aprovado.\nMotivo informado: $motivo"
        mailSender.send(msg)
        log.info("E-mail de rejeição enviado sagaId={} destino={}", sagaId, to)
    }
}
