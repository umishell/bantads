package bantads.conta.config

import bantads.conta.model.Conta
import bantads.conta.repository.ContaRepository
import org.slf4j.LoggerFactory
import org.springframework.boot.ApplicationRunner
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.core.annotation.Order
import java.math.BigDecimal
import java.time.Instant

/**
 * Contas iniciais alinhadas ao seed de clientes/gerentes (números de 4 dígitos do mock legado).
 */
@Configuration
class ContaDevSeed {

    private val log = LoggerFactory.getLogger(javaClass)

    @Bean
    @Order(13)
    fun seedContasIniciais(repo: ContaRepository) = ApplicationRunner {
        if (repo.existsByNumero("1291")) return@ApplicationRunner
        repo.save(
            Conta(
                numero = "1291",
                saldo = BigDecimal("800.00"),
                limite = BigDecimal("5000.00"),
                clienteId = BantadsDevEntityIds.CLIENTE_CLI1,
                gerenteId = BantadsDevEntityIds.GERENTE_GER1,
                sagaId = null,
                ativa = true,
                dataCriacao = Instant.parse("2000-01-01T00:00:00Z"),
            ),
        )
        repo.save(
            Conta(
                numero = "0950",
                saldo = BigDecimal("-10000.00"),
                limite = BigDecimal("10000.00"),
                clienteId = BantadsDevEntityIds.CLIENTE_CLI2,
                gerenteId = BantadsDevEntityIds.GERENTE_GER2,
                sagaId = null,
                ativa = true,
                dataCriacao = Instant.parse("1990-10-10T00:00:00Z"),
            ),
        )
        log.info("Seed: contas 1291 e 0950 criadas")
    }
}
