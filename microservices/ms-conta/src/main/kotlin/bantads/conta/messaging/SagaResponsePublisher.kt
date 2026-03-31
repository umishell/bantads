package bantads.conta.messaging

import bantads.conta.config.RabbitConfig
import org.springframework.amqp.rabbit.core.RabbitTemplate
import org.springframework.stereotype.Component

@Component
class SagaResponsePublisher(
    private val rabbitTemplate: RabbitTemplate,
) {
    fun publish(routingKey: String, body: Map<String, Any?>) {
        rabbitTemplate.convertAndSend(RabbitConfig.RESPONSE_EXCHANGE, routingKey, body)
    }
}
