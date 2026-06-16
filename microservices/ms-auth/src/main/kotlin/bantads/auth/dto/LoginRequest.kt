package bantads.auth.dto

import com.fasterxml.jackson.annotation.JsonAlias
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
data class LoginRequest(
    @field:JsonAlias("email")
    @field:NotBlank(message = "O login (ou e-mail) não pode estar em branco")
    val login: String,

    @field:NotBlank(message = "A senha é obrigatória")
    val senha: String
)
