package bantads.cliente.integration

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import java.math.BigDecimal
import java.util.UUID

@JsonIgnoreProperties(ignoreUnknown = true)
data class ContaUpstreamDto(
    val id: UUID,
    val numero: String,
    val clienteId: UUID,
    val gerenteId: UUID,
    val saldo: BigDecimal,
    val limite: BigDecimal,
    val ativa: Boolean,
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class GerenteUpstreamDto(
    val id: UUID,
    val cpf: String,
    val nome: String,
    val email: String,
    val telefone: String,
)
