package bantads.cliente.config

import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Configuration

@ConfigurationProperties(prefix = "bantads.saga")
data class SagaProperties(
    val exchange: String = "bantads.saga",
    /** Topic routing: deve casar com binding `evt.cliente.#` da saga. */
    val routingKeyPendenteCriado: String = "evt.cliente.pendente.criado",
    val routingKeyAprovacaoIniciada: String = "evt.cliente.aprovacao.iniciada",
    val routingKeyRejeitado: String = "evt.cliente.rejeitado",
)

@Configuration
@EnableConfigurationProperties(SagaProperties::class)
class SagaPropertiesConfiguration
