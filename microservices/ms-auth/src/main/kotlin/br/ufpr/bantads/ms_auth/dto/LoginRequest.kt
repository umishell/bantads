import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class LoginRequest(
    @field:NotBlank(message = "O login não pode estar em branco")
    val login: String,

    @field:NotBlank(message = "A senha é obrigatória")
    @field:Size(min = 4, message = "A senha deve ter no mínimo 4 caracteres")
    val senha: String
)