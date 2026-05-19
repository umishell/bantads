package bantads.conta.config

import bantads.conta.repository.ContaRepository
import org.slf4j.LoggerFactory
import org.springframework.boot.ApplicationRunner
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.core.annotation.Order

@Configuration
class ContaDevSeed {

    private val log = LoggerFactory.getLogger(javaClass)

    @Bean
    @Order(13)
    fun seedContasIniciais(repo: ContaRepository, seedService: ContaSeedService) = ApplicationRunner {
        if (repo.existsByNumero("1291")) return@ApplicationRunner
        seedService.resetAndSeed("full")
        log.info("Seed: contas do PDF (1291, 0950, 8573, 5887, 7617)")
    }
}
