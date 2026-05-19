package bantads.auth.dto

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class CriarUsuarioInternoRequest(
    @field:NotBlank
    @field:Email
    val email: String,
    @field:NotBlank
    @field:Size(min = 3, max = 200)
    val nome: String,
    @field:NotBlank
    val cpf: String,
    @field:NotBlank
    @field:Size(min = 4, max = 64)
    val senha: String,
    @field:NotBlank
    val perfil: String,
)

data class RemoverUsuarioInternoRequest(
    @field:NotBlank
    @field:Email
    val email: String,
)
