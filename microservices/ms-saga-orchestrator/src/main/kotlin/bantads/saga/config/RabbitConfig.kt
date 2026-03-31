package bantads.saga.config

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import org.springframework.amqp.core.Binding
import org.springframework.amqp.core.BindingBuilder
import org.springframework.amqp.core.Queue
import org.springframework.amqp.core.TopicExchange
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory
import org.springframework.amqp.rabbit.connection.ConnectionFactory
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter
import org.springframework.amqp.support.converter.SimpleMessageConverter
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
@EnableConfigurationProperties(SagaProperties::class)
class RabbitConfig(private val props: SagaProperties) {

    @Bean
    fun sagaObjectMapper(): ObjectMapper =
        ObjectMapper().registerKotlinModule().registerModule(JavaTimeModule())

    @Bean
    fun jacksonMessageConverter(mapper: ObjectMapper): Jackson2JsonMessageConverter =
        Jackson2JsonMessageConverter(mapper)

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

    /** JSON bruto como String (evita Map/List genéricos em eventos aninhados). */
    @Bean
    fun rawJsonListenerContainerFactory(connectionFactory: ConnectionFactory): SimpleRabbitListenerContainerFactory {
        val f = SimpleRabbitListenerContainerFactory()
        f.setConnectionFactory(connectionFactory)
        f.setMessageConverter(SimpleMessageConverter())
        return f
    }

    @Bean
    fun bantadsSagaExchange(): TopicExchange =
        TopicExchange(props.exchange, true, false)

    @Bean
    fun sagaResponseExchange(): TopicExchange =
        TopicExchange(props.responseExchange, true, false)

    /** Entrada: eventos publicados pelo ms-cliente (somente a saga consome estas chaves). */
    @Bean
    fun sagaClienteEventsQueue(): Queue =
        Queue("saga.cliente.events", true)

    @Bean
    fun bindingClienteEvents(
        sagaClienteEventsQueue: Queue,
        bantadsSagaExchange: TopicExchange,
    ): Binding =
        BindingBuilder.bind(sagaClienteEventsQueue).to(bantadsSagaExchange).with("evt.cliente.#")

    /** Respostas assíncronas dos microsserviços. */
    @Bean
    fun sagaInboundResponsesQueue(): Queue =
        Queue("saga.inbound.responses", true)

    @Bean
    fun bindingSagaResponses(
        sagaInboundResponsesQueue: Queue,
        sagaResponseExchange: TopicExchange,
    ): Binding =
        BindingBuilder.bind(sagaInboundResponsesQueue).to(sagaResponseExchange).with("resp.#")

    /** Garante que as filas existam antes do orquestrador publicar comandos. */
    @Bean
    fun cmdGerenteQueue(): Queue = Queue("cmd.gerente", true)

    @Bean
    fun cmdContaQueue(): Queue = Queue("cmd.conta", true)

    @Bean
    fun cmdAuthQueue(): Queue = Queue("cmd.auth", true)

    @Bean
    fun cmdEmailQueue(): Queue = Queue("cmd.email", true)

    @Bean
    fun cmdClienteQueue(): Queue = Queue("cmd.cliente", true)
}
