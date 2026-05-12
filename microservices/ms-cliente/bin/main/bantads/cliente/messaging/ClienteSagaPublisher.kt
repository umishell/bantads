package bantads.cliente.messaging

import bantads.cliente.config.SagaProperties
import org.slf4j.LoggerFactory
import org.springframework.amqp.rabbit.core.RabbitTemplate
import org.springframework.stereotype.Component

@Component
class ClienteSagaPublisher(
    private val rabbitTemplate: RabbitTemplate,
    private val sagaProperties: SagaProperties,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    fun publicarClientePendenteCriado(payload: Map<String, Any?>) {
        send(sagaProperties.routingKeyPendenteCriado, payload + mapOf("eventType" to "CLIENTE_PENDENTE_CRIADO"))
    }

    fun publicarAprovacaoIniciada(payload: Map<String, Any?>) {
        send(sagaProperties.routingKeyAprovacaoIniciada, payload + mapOf("eventType" to "CLIENTE_APROVACAO_INICIADA"))
    }

    fun publicarClienteRejeitado(payload: Map<String, Any?>) {
        send(sagaProperties.routingKeyRejeitado, payload + mapOf("eventType" to "CLIENTE_REJEITADO"))
    }

    private fun send(routingKey: String, body: Map<String, Any?>) {
        try {
            rabbitTemplate.convertAndSend(sagaProperties.exchange, routingKey, body)
        } catch (ex: Exception) {
            log.error("Falha ao publicar evento SAGA (routing={}): {}", routingKey, ex.message)
            throw ex
        }
    }
}
