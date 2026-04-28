package bantads.cliente.dto

import java.util.UUID

/** Opcional: id do gerente logado para auditoria (não define gerente da conta — R1/saga). */
data class AprovarClienteRequest(
    val gerenteAuditoriaId: UUID? = null,
)
