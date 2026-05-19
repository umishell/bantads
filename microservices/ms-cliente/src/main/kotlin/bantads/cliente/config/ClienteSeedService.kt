package bantads.cliente.config

import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.util.UUID

@Service
class ClienteSeedService(
    private val jdbc: JdbcTemplate,
) {
    @Transactional
    fun resetAndSeed(profile: String = "full") {
        jdbc.execute("DELETE FROM cliente")
        when (profile.lowercase()) {
            "single-gerente" -> insertCli1()
            else -> {
                insertCli1()
                insertCli2()
                insertCli3()
                insertCli4()
                insertCli5()
            }
        }
    }

    private fun insertCli1() = insert(
        BantadsDevEntityIds.CLIENTE_CLI1,
        "12912861012",
        "cli1@bantads.com.br",
        "Catharyna",
        "(41) 99999-1001",
        "10000.00",
        "80000001",
        "Rua das Araucárias 101",
    )

    private fun insertCli2() = insert(
        BantadsDevEntityIds.CLIENTE_CLI2,
        "09506382000",
        "cli2@bantads.com.br",
        "Cleuddônio",
        "(41) 99999-1002",
        "20000.00",
        "80000002",
        "Avenida do Bosque 202",
    )

    private fun insertCli3() = insert(
        BantadsDevEntityIds.CLIENTE_CLI3,
        "85733854057",
        "cli3@bantads.com.br",
        "Catianna",
        "(41) 99999-1003",
        "3000.00",
        "80000003",
        "Rua XV de Novembro 303",
    )

    private fun insertCli4() = insert(
        BantadsDevEntityIds.CLIENTE_CLI4,
        "58872160006",
        "cli4@bantads.com.br",
        "Cutardo",
        "(41) 99999-1004",
        "500.00",
        "80000004",
        "Travessa das Palmeiras 404",
    )

    private fun insertCli5() = insert(
        BantadsDevEntityIds.CLIENTE_CLI5,
        "76179646090",
        "cli5@bantads.com.br",
        "Coândrya",
        "(41) 99999-1005",
        "1500.00",
        "80000005",
        "Alameda dos Ipês 505",
    )

    private fun insert(
        id: UUID,
        cpf: String,
        email: String,
        nome: String,
        telefone: String,
        salario: String,
        cep: String,
        endereco: String,
    ) {
        jdbc.update(
            """
            INSERT INTO cliente (
                id, cpf, email, nome, telefone, salario, endereco, cep, cidade, estado,
                status, motivo_rejeicao, decisao_gerente_em, criado_em
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Curitiba', 'PR', 'APROVADO', NULL, ?, ?)
            """.trimIndent(),
            id,
            cpf,
            email,
            nome,
            telefone,
            BigDecimal(salario),
            endereco,
            cep,
            java.sql.Timestamp.from(java.time.Instant.parse("2000-01-01T00:00:00Z")),
            java.sql.Timestamp.from(java.time.Instant.parse("2000-01-01T00:00:00Z")),
        )
    }
}
