package bantads.gerente.config

import bantads.gerente.model.Gerente
import bantads.gerente.repository.GerenteRepository
import org.slf4j.LoggerFactory
import org.springframework.boot.ApplicationRunner
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
class GerenteSeed {

    private val log = LoggerFactory.getLogger(javaClass)

    @Bean
    fun seedGerentes(repo: GerenteRepository) = ApplicationRunner {
        if (repo.count() > 0) return@ApplicationRunner
        listOf(
            Gerente(cpf = "11111111111", nome = "Gerente Um", email = "g1@bantads.local"),
            Gerente(cpf = "22222222222", nome = "Gerente Dois", email = "g2@bantads.local"),
            Gerente(cpf = "33333333333", nome = "Gerente Três", email = "g3@bantads.local"),
        ).forEach { repo.save(it) }
        log.info("Seed: {} gerentes criados", repo.count())
    }
}
