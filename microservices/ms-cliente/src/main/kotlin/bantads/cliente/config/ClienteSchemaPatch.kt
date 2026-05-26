package bantads.cliente.config

import org.slf4j.LoggerFactory
import org.springframework.boot.ApplicationRunner
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.core.annotation.Order
import org.springframework.jdbc.core.JdbcTemplate

/**
 * Volumes Postgres antigos podem existir sem índice único de e-mail.
 * Hibernate `ddl-auto: update` nem sempre adiciona UNIQUE em colunas já populadas.
 */
@Configuration
class ClienteSchemaPatch {

    private val log = LoggerFactory.getLogger(javaClass)

    @Bean
    @Order(5)
    fun patchClienteSchema(jdbc: JdbcTemplate) = ApplicationRunner {
        jdbc.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS uk_cliente_email ON cliente (email);
            """.trimIndent(),
        )
        log.info("Schema patch cliente: índice único de e-mail garantido")
    }
}
