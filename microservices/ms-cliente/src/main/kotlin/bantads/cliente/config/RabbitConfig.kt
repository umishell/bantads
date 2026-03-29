package bantads.cliente.config

import org.springframework.amqp.core.Queue
import org.springframework.amqp.core.TopicExchange
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory
import org.springframework.amqp.rabbit.connection.ConnectionFactory
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter
import org.springframework.amqp.support.converter.SimpleMessageConverter
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
class RabbitConfig(private val sagaProperties: SagaProperties) {

    companion object {
        const val QUEUE_CMD = "cmd.cliente"
    }

    @Bean
    fun sagaTopicExchange(): TopicExchange =
        TopicExchange(sagaProperties.exchange, true, false)

    @Bean
    fun cmdClienteQueue(): Queue = Queue(QUEUE_CMD, true)

    @Bean
    fun jacksonMessageConverter(): Jackson2JsonMessageConverter =
        Jackson2JsonMessageConverter()

    @Bean
    fun rabbitListenerContainerFactory(
        connectionFactory: ConnectionFactory,
        jacksonMessageConverter: Jackson2JsonMessageConverter,
    ): SimpleRabbitListenerContainerFactory {
        val f = SimpleRabbitListenerContainerFactory()
        f.setConnectionFactory(connectionFactory)
        f.setMessageConverter(jacksonMessageConverter)
        return f
    }

    @Bean
    fun rawJsonListenerContainerFactory(connectionFactory: ConnectionFactory): SimpleRabbitListenerContainerFactory {
        val f = SimpleRabbitListenerContainerFactory()
        f.setConnectionFactory(connectionFactory)
        f.setMessageConverter(SimpleMessageConverter())
        return f
    }
}
