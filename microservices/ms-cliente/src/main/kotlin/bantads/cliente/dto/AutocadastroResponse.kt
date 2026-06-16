package bantads.cliente.dto

import java.util.UUID

data class AutocadastroResponse(
    val message: String,
    val avisos: List<String>,
    val clienteId: UUID,
    val cpf: String,
)
