package bantads.conta.dto

import java.math.BigDecimal
import java.util.UUID

/**
 * Projeção leve usada por ms-gerente no dashboard do administrador (R15).
 * Traz, por gerente, totais agregados das contas ativas.
 */
data class AgregadoPorGerenteResponse(
    val gerenteId: UUID,
    val totalClientes: Long,
    val somaSaldosPositivos: BigDecimal,
    val somaSaldosNegativos: BigDecimal,
)
