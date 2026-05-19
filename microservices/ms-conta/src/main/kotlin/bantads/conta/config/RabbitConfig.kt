package bantads.conta.config

import org.springframework.amqp.core.Binding
import org.springframework.amqp.core.BindingBuilder
import org.springframework.amqp.core.Queue
import org.springframework.amqp.core.QueueBuilder
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
        const val QUEUE_CMD = "cmd.conta"
        const val RESPONSE_EXCHANGE = "saga-response-exchange"
        const val QUEUE_INTERNAL_RESPONSES = "conta.internal.responses"
        const val DLX_EXCHANGE = "bantads.dlx"
    }

    @Bean
    fun cmdContaQueue(): Queue =
        QueueBuilder.durable(QUEUE_CMD)
            .withArgument("x-dead-letter-exchange", DLX_EXCHANGE)
            .withArgument("x-dead-letter-routing-key", "dlq.$QUEUE_CMD")
            .build()

    @Bean
    fun sagaResponseExchange(): TopicExchange =
        TopicExchange(RESPONSE_EXCHANGE, true, false)

    @Bean
    fun contaInternalResponsesQueue(): Queue =
        QueueBuilder.durable(QUEUE_INTERNAL_RESPONSES)
            .withArgument("x-dead-letter-exchange", DLX_EXCHANGE)
            .withArgument("x-dead-letter-routing-key", "dlq.$QUEUE_INTERNAL_RESPONSES")
            .build()

    @Bean
    fun bindingContaInternalResponses(
        contaInternalResponsesQueue: Queue,
        sagaResponseExchange: TopicExchange,
    ): Binding =
        BindingBuilder.bind(contaInternalResponsesQueue).to(sagaResponseExchange).with("resp.conta")

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
