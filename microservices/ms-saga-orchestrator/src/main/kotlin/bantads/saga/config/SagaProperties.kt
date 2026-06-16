package bantads.saga.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "bantads.saga")
data class SagaProperties(
    val exchange: String = "bantads.saga",
    val responseExchange: String = "saga-response-exchange",
    val emailMaxAttempts: Int = 3,
)
