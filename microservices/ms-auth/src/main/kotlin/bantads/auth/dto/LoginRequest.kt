package bantads.auth.dto

import com.fasterxml.jackson.annotation.JsonAlias
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

/** Aceita `login` (Swagger/test_dac) ou `email` como alias no JSON. */
data class LoginRequest(
    @field:JsonAlias("email")
    @field:NotBlank(message = "O login (ou e-mail) não pode estar em branco")
    val login: String,

    @field:NotBlank(message = "A senha é obrigatória")
    @field:Size(min = 4, message = "A senha deve ter no mínimo 4 caracteres")
    val senha: String
)
