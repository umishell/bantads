package bantads.cliente.dto

import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

data class ClientePendenteListItemResponse(
    val id: UUID,
    val cpf: String,
    val nome: String,
    val email: String,
    val telefone: String,
    val salario: BigDecimal,
    val cidade: String,
    val estado: String,
    val criadoEm: Instant,
)
