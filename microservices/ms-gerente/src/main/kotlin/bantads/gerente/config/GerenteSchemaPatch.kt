package bantads.gerente.config

import org.slf4j.LoggerFactory
import org.springframework.boot.ApplicationRunner
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.core.annotation.Order
import org.springframework.jdbc.core.JdbcTemplate

/**
 * Volumes Postgres antigos podem existir sem colunas novas do modelo JPA.
 * Hibernate `ddl-auto: update` nem sempre adiciona coluna NOT NULL em tabelas já populadas.
 */
@Configuration
class GerenteSchemaPatch {

    private val log = LoggerFactory.getLogger(javaClass)

    @Bean
    @Order(5)
    fun patchGerenteSchema(jdbc: JdbcTemplate) = ApplicationRunner {
        jdbc.execute(
            """
            ALTER TABLE gerente
            ADD COLUMN IF NOT EXISTS telefone varchar(20) NOT NULL DEFAULT '';
            ALTER TABLE gerente
            ADD COLUMN IF NOT EXISTS tipo varchar(20) NOT NULL DEFAULT 'GERENTE';
            """.trimIndent(),
        )
        log.info("Schema patch gerente: colunas telefone e tipo garantidas")
    }
}
