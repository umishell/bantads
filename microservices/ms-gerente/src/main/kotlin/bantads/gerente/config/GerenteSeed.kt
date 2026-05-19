package bantads.gerente.config

import bantads.gerente.repository.GerenteRepository
import org.slf4j.LoggerFactory
import org.springframework.boot.ApplicationRunner
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.core.annotation.Order

@Configuration
class GerenteSeed {

    private val log = LoggerFactory.getLogger(javaClass)

    @Bean
    @Order(11)
    fun seedGerentes(repo: GerenteRepository, seedService: GerenteSeedService) = ApplicationRunner {
        if (repo.count() > 0) return@ApplicationRunner
        seedService.resetAndSeed("full")
        log.info("Seed: {} gerentes/admin criados", repo.count())
    }
}
