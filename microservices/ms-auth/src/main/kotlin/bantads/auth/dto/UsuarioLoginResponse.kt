package bantads.auth.dto

import com.fasterxml.jackson.annotation.JsonInclude

@JsonInclude(JsonInclude.Include.NON_NULL)
data class UsuarioLoginResponse(
    val cpf: String,
    val nome: String,
    val email: String,
    val tipo: String,
)
