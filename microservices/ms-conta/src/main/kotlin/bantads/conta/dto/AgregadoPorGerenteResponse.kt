package bantads.conta.dto

import java.math.BigDecimal
import java.util.UUID
data class AgregadoPorGerenteResponse(
    val gerenteId: UUID,
    val totalClientes: Long,
    val somaSaldosPositivos: BigDecimal,
    val somaSaldosNegativos: BigDecimal,
)
