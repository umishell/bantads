package bantads.cliente.config

import bantads.cliente.repository.ClienteRepository
import org.slf4j.LoggerFactory
import org.springframework.boot.ApplicationRunner
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.core.Ordered
import org.springframework.core.annotation.Order

@Configuration
class ClienteDevSeed {

    private val log = LoggerFactory.getLogger(javaClass)

    @Bean
    @Order(Ordered.HIGHEST_PRECEDENCE)
    fun seedClientesAprovados(repo: ClienteRepository, seedService: ClienteSeedService) = ApplicationRunner {
        if (repo.count() > 0) return@ApplicationRunner
        seedService.resetAndSeed("full")
        log.info("Seed: {} clientes aprovados (PDF)", repo.count())
    }
}
