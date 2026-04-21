package bantads.saga.config

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import org.springframework.amqp.core.Binding
import org.springframework.amqp.core.BindingBuilder
import org.springframework.amqp.core.Queue
import org.springframework.amqp.core.QueueBuilder
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

    companion object {
        const val DLX_EXCHANGE = "bantads.dlx"

        /** Cria fila durable com roteamento para DLX padronizado. Use em toda fila de negócio. */
        fun durableWithDlq(name: String): Queue =
            QueueBuilder.durable(name)
                .withArgument("x-dead-letter-exchange", DLX_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", "dlq.$name")
                .build()

        fun dlqQueue(originName: String): Queue =
            QueueBuilder.durable("dlq.$originName").build()
    }

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

    @Bean
    fun bantadsDlxExchange(): TopicExchange =
        TopicExchange(DLX_EXCHANGE, true, false)

    /** Entrada: eventos publicados pelo ms-cliente (somente a saga consome estas chaves). */
    @Bean
    fun sagaClienteEventsQueue(): Queue = durableWithDlq("saga.cliente.events")

    @Bean
    fun bindingClienteEvents(
        sagaClienteEventsQueue: Queue,
        bantadsSagaExchange: TopicExchange,
    ): Binding =
        BindingBuilder.bind(sagaClienteEventsQueue).to(bantadsSagaExchange).with("evt.cliente.#")

    /** Respostas assíncronas dos microsserviços. */
    @Bean
    fun sagaInboundResponsesQueue(): Queue = durableWithDlq("saga.inbound.responses")

    @Bean
    fun bindingSagaResponses(
        sagaInboundResponsesQueue: Queue,
        sagaResponseExchange: TopicExchange,
    ): Binding =
        BindingBuilder.bind(sagaInboundResponsesQueue).to(sagaResponseExchange).with("resp.#")

    /** Garante que as filas existam antes do orquestrador publicar comandos. */
    @Bean fun cmdGerenteQueue(): Queue = durableWithDlq("cmd.gerente")
    @Bean fun cmdContaQueue(): Queue = durableWithDlq("cmd.conta")
    @Bean fun cmdAuthQueue(): Queue = durableWithDlq("cmd.auth")
    @Bean fun cmdEmailQueue(): Queue = durableWithDlq("cmd.email")
    @Bean fun cmdClienteQueue(): Queue = durableWithDlq("cmd.cliente")

    /** DLQs por origem + bindings para `dlq.<origin>`. */
    @Bean fun dlqSagaClienteEvents(): Queue = dlqQueue("saga.cliente.events")
    @Bean fun dlqSagaInboundResponses(): Queue = dlqQueue("saga.inbound.responses")
    @Bean fun dlqCmdGerente(): Queue = dlqQueue("cmd.gerente")
    @Bean fun dlqCmdConta(): Queue = dlqQueue("cmd.conta")
    @Bean fun dlqCmdAuth(): Queue = dlqQueue("cmd.auth")
    @Bean fun dlqCmdEmail(): Queue = dlqQueue("cmd.email")
    @Bean fun dlqCmdCliente(): Queue = dlqQueue("cmd.cliente")

    private fun bind(q: Queue, dlx: TopicExchange): Binding =
        BindingBuilder.bind(q).to(dlx).with("dlq.${q.name.removePrefix("dlq.")}")

    @Bean fun bindDlqSagaClienteEvents(dlqSagaClienteEvents: Queue, bantadsDlxExchange: TopicExchange) =
        bind(dlqSagaClienteEvents, bantadsDlxExchange)

    @Bean fun bindDlqSagaInboundResponses(dlqSagaInboundResponses: Queue, bantadsDlxExchange: TopicExchange) =
        bind(dlqSagaInboundResponses, bantadsDlxExchange)

    @Bean fun bindDlqCmdGerente(dlqCmdGerente: Queue, bantadsDlxExchange: TopicExchange) =
        bind(dlqCmdGerente, bantadsDlxExchange)

    @Bean fun bindDlqCmdConta(dlqCmdConta: Queue, bantadsDlxExchange: TopicExchange) =
        bind(dlqCmdConta, bantadsDlxExchange)

    @Bean fun bindDlqCmdAuth(dlqCmdAuth: Queue, bantadsDlxExchange: TopicExchange) =
        bind(dlqCmdAuth, bantadsDlxExchange)

    @Bean fun bindDlqCmdEmail(dlqCmdEmail: Queue, bantadsDlxExchange: TopicExchange) =
        bind(dlqCmdEmail, bantadsDlxExchange)

    @Bean fun bindDlqCmdCliente(dlqCmdCliente: Queue, bantadsDlxExchange: TopicExchange) =
        bind(dlqCmdCliente, bantadsDlxExchange)
}
