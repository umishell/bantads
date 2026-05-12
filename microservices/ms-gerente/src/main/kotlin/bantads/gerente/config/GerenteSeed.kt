package bantads.gerente.config

import bantads.gerente.model.Gerente
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
    fun seedGerentes(repo: GerenteRepository) = ApplicationRunner {
        if (repo.count() > 0) return@ApplicationRunner
        listOf(
            Gerente(
                id = BantadsDevEntityIds.GERENTE_GER1,
                cpf = "98574307084",
                nome = "Geniéve",
                email = "ger1@bantads.com.br",
                telefone = "(41) 99991-0001",
                tipo = "GERENTE",
            ),
            Gerente(
                id = BantadsDevEntityIds.GERENTE_GER2,
                cpf = "64065268052",
                nome = "Godophredo",
                email = "ger2@bantads.com.br",
                telefone = "(41) 99991-0002",
                tipo = "GERENTE",
            ),
            Gerente(
                id = BantadsDevEntityIds.GERENTE_GER3,
                cpf = "23862179060",
                nome = "Gyândula",
                email = "ger3@bantads.com.br",
                telefone = "(41) 99991-0003",
                tipo = "GERENTE",
            ),
            Gerente(
                id = BantadsDevEntityIds.GERENTE_ADM1,
                cpf = "40501740066",
                nome = "Adamântio",
                email = "adm1@bantads.com.br",
                telefone = "(41) 99991-0004",
                tipo = "ADMINISTRADOR",
            ),
        ).forEach { repo.save(it) }
        log.info("Seed: {} gerentes/admin criados", repo.count())
    }
}
