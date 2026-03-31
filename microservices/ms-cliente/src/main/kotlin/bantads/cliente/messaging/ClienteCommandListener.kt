package bantads.cliente.messaging

import bantads.cliente.config.RabbitConfig
import bantads.cliente.model.StatusCliente
import bantads.cliente.repository.ClienteRepository
import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.amqp.rabbit.annotation.RabbitListener
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Component
class ClienteCommandListener(
    private val repository: ClienteRepository,
    private val objectMapper: ObjectMapper,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @Transactional
    @RabbitListener(queues = [RabbitConfig.QUEUE_CMD], containerFactory = "rawJsonListenerContainerFactory")
    fun onMessage(body: String) {
        val root = objectMapper.readTree(body)
        val cmd = root.path("command").asText()
        val clienteId = UUID.fromString(root.path("clienteId").asText())
        val sagaId = root.path("sagaId").asText()
        when (cmd) {
            "CLIENTE_MARCAR_APROVADO" -> marcarAprovado(clienteId, sagaId)
            "CLIENTE_MARCAR_PENDENTE" -> marcarPendente(clienteId, sagaId, root.path("motivo").asText())
            else -> log.warn("Comando cliente desconhecido: {}", cmd)
        }
    }

    private fun marcarAprovado(clienteId: UUID, sagaId: String) {
        val c = repository.findById(clienteId).orElse(null) ?: run {
            log.warn("CLIENTE_MARCAR_APROVADO: cliente {} não encontrado sagaId={}", clienteId, sagaId)
            return
        }
        if (c.status == StatusCliente.APROVADO) {
            log.info("Idempotente: cliente {} já APROVADO", clienteId)
            return
        }
        if (c.status != StatusCliente.PROCESSANDO_APROVACAO) {
            log.warn("Ignorando APROVADO: cliente {} em estado {}", clienteId, c.status)
            return
        }
        c.status = StatusCliente.APROVADO
        repository.save(c)
        log.info("Cliente {} APROVADO após e-mail sagaId={}", clienteId, sagaId)
    }

    private fun marcarPendente(clienteId: UUID, sagaId: String, motivo: String) {
        val c = repository.findById(clienteId).orElse(null) ?: return
        if (c.status != StatusCliente.PROCESSANDO_APROVACAO) {
            log.info("Ignorando volta a pendente: cliente {} estado {}", clienteId, c.status)
            return
        }
        c.status = StatusCliente.PENDENTE_APROVACAO
        repository.save(c)
        log.info("Cliente {} voltou para PENDENTE (saga falhou) sagaId={} motivo={}", clienteId, sagaId, motivo)
    }
}
