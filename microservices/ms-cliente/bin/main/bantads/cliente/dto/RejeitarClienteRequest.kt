package bantads.cliente.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class RejeitarClienteRequest(
    @field:NotBlank(message = "Motivo é obrigatório")
    @field:Size(max = 2000)
    val motivo: String,
)
