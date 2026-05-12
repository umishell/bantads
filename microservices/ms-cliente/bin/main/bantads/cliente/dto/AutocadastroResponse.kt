package bantads.cliente.dto

import java.util.UUID

data class AutocadastroResponse(
    val message: String,
    /** Mensagens explícitas para o usuário (Fase 1). */
    val avisos: List<String>,
    val clienteId: UUID,
    val cpf: String,
)
