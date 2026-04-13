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
            Gerente(cpf = "98574307084", nome = "Geniéve", email = "ger1@bantads.com.br", tipo = "GERENTE"),
            Gerente(cpf = "64065268052", nome = "Godophredo", email = "ger2@bantads.com.br", tipo = "GERENTE"),
            Gerente(cpf = "23862179060", nome = "Gyândula", email = "ger3@bantads.com.br", tipo = "GERENTE"),
            Gerente(cpf = "40501740066", nome = "Adamântio", email = "adm1@bantads.com.br", tipo = "ADMINISTRADOR"),
        ).forEach { repo.save(it) }
        log.info("Seed: {} gerentes/admin criados", repo.count())
    }
}
