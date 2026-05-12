package bantads.cliente.config

import bantads.cliente.model.Cliente
import bantads.cliente.model.StatusCliente
import bantads.cliente.repository.ClienteRepository
import org.slf4j.LoggerFactory
import org.springframework.boot.ApplicationRunner
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.core.annotation.Order
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

/**
 * Clientes aprovados alinhados ao [bantads.auth.service.AuthSeedService] (Mongo),
 * para integração local / Docker sem importar o SQL legado (`sql/03_…`).
 */
@Configuration
class ClienteDevSeed {

    private val log = LoggerFactory.getLogger(javaClass)

    @Bean
    @Order(12)
    fun seedClientesAprovados(repo: ClienteRepository) = ApplicationRunner {
        seedIfAbsent(
            repo,
            BantadsDevEntityIds.CLIENTE_CLI1,
            "12912861012",
            "cli1@bantads.com.br",
            "Catharyna",
            telefone = "(41) 99999-1001",
            salario = BigDecimal("10000.00"),
            cep = "80000001",
            endereco = "Rua das Araucárias 101",
        )
        seedIfAbsent(
            repo,
            BantadsDevEntityIds.CLIENTE_CLI2,
            "09506382000",
            "cli2@bantads.com.br",
            "Cleuddônio",
            telefone = "(41) 99999-1002",
            salario = BigDecimal("20000.00"),
            cep = "80000002",
            endereco = "Avenida do Bosque 202",
        )
    }

    private fun seedIfAbsent(
        repo: ClienteRepository,
        id: UUID,
        cpf: String,
        email: String,
        nome: String,
        telefone: String,
        salario: BigDecimal,
        cep: String,
        endereco: String,
    ) {
        if (repo.existsByCpf(cpf)) return
        val c = Cliente(
            id = id,
            cpf = cpf,
            email = email,
            nome = nome,
            telefone = telefone,
            salario = salario,
            endereco = endereco,
            cep = cep,
            cidade = "Curitiba",
            estado = "PR",
            status = StatusCliente.APROVADO,
            decisaoGerenteEm = Instant.parse("2000-01-01T00:00:00Z"),
            criadoEm = Instant.parse("2000-01-01T00:00:00Z"),
        )
        repo.save(c)
        log.info("Seed cliente cpf={} id={}", cpf, id)
    }
}
