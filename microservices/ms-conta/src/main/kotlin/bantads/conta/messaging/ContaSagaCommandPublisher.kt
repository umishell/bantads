package bantads.conta.messaging

import bantads.conta.config.RabbitConfig
import org.springframework.amqp.rabbit.core.RabbitTemplate
import org.springframework.stereotype.Component

@Component
class ContaSagaCommandPublisher(
    private val rabbitTemplate: RabbitTemplate,
) {
    fun publish(body: Map<String, Any?>) {
        rabbitTemplate.convertAndSend("", RabbitConfig.QUEUE_CMD, body)
    }
}
