package bantads.gerente.config

import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class GerenteSeedService(
    private val jdbc: JdbcTemplate,
) {
    @Transactional
    fun resetAndSeed(profile: String = "full") {
        jdbc.execute("DELETE FROM gerente")
        when (profile.lowercase()) {
            "single-gerente" -> {
                insert(
                    BantadsDevEntityIds.GERENTE_GER1,
                    "98574307084",
                    "Geniéve",
                    "ger1@bantads.com.br",
                    "(41) 99991-0001",
                    "GERENTE",
                )
                insert(
                    BantadsDevEntityIds.GERENTE_ADM1,
                    "40501740066",
                    "Adamântio",
                    "adm1@bantads.com.br",
                    "(41) 99991-0004",
                    "ADMINISTRADOR",
                )
            }
            else -> {
                insert(
                    BantadsDevEntityIds.GERENTE_GER1,
                    "98574307084",
                    "Geniéve",
                    "ger1@bantads.com.br",
                    "(41) 99991-0001",
                    "GERENTE",
                )
                insert(
                    BantadsDevEntityIds.GERENTE_GER2,
                    "64065268052",
                    "Godophredo",
                    "ger2@bantads.com.br",
                    "(41) 99991-0002",
                    "GERENTE",
                )
                insert(
                    BantadsDevEntityIds.GERENTE_GER3,
                    "23862179060",
                    "Gyândula",
                    "ger3@bantads.com.br",
                    "(41) 99991-0003",
                    "GERENTE",
                )
                insert(
                    BantadsDevEntityIds.GERENTE_ADM1,
                    "40501740066",
                    "Adamântio",
                    "adm1@bantads.com.br",
                    "(41) 99991-0004",
                    "ADMINISTRADOR",
                )
            }
        }
    }

    private fun insert(
        id: UUID,
        cpf: String,
        nome: String,
        email: String,
        telefone: String,
        tipo: String,
    ) {
        jdbc.update(
            """
            INSERT INTO gerente (id, cpf, nome, email, telefone, tipo, ativo)
            VALUES (?, ?, ?, ?, ?, ?, true)
            """.trimIndent(),
            id,
            cpf,
            nome,
            email,
            telefone,
            tipo,
        )
    }
}
