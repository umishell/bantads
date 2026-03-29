package bantads.auth.config

import org.springframework.amqp.core.Queue
import org.springframework.amqp.core.TopicExchange
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory
import org.springframework.amqp.rabbit.connection.ConnectionFactory
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter
import org.springframework.amqp.support.converter.SimpleMessageConverter
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
class RabbitConfig {

    companion object {
        const val QUEUE_CMD = "cmd.auth"
        const val RESPONSE_EXCHANGE = "saga-response-exchange"
    }

    @Bean
    fun cmdAuthQueue(): Queue = Queue(QUEUE_CMD, true)

    @Bean
    fun sagaResponseExchange(): TopicExchange =
        TopicExchange(RESPONSE_EXCHANGE, true, false)

    @Bean
    fun messageConverter(): Jackson2JsonMessageConverter = Jackson2JsonMessageConverter()

    @Bean
    fun rabbitListenerContainerFactory(
        connectionFactory: ConnectionFactory,
        messageConverter: Jackson2JsonMessageConverter,
    ): SimpleRabbitListenerContainerFactory {
        val factory = SimpleRabbitListenerContainerFactory()
        factory.setConnectionFactory(connectionFactory)
        factory.setMessageConverter(messageConverter)
        return factory
    }

    @Bean
    fun rawJsonListenerContainerFactory(connectionFactory: ConnectionFactory): SimpleRabbitListenerContainerFactory {
        val f = SimpleRabbitListenerContainerFactory()
        f.setConnectionFactory(connectionFactory)
        f.setMessageConverter(SimpleMessageConverter())
        return f
    }
}
