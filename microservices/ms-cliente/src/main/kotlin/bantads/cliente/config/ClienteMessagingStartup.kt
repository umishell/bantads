package bantads.cliente.config

import org.slf4j.LoggerFactory
import org.springframework.amqp.rabbit.listener.RabbitListenerEndpointRegistry
import org.springframework.boot.ApplicationRunner
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.core.annotation.Order
@Configuration
class ClienteMessagingStartup {

    private val log = LoggerFactory.getLogger(javaClass)

    @Bean
    @Order(20)
    fun startClienteRabbitListeners(registry: RabbitListenerEndpointRegistry) = ApplicationRunner {
        registry.listenerContainers.forEach { container ->
            if (!container.isRunning) {
                container.start()
                log.info("Listener Rabbit iniciado: {}", container)
            }
        }
    }
}
