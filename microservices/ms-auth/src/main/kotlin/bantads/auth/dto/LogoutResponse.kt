package bantads.auth.dto

data class LogoutResponse(
    val cpf: String,
    val nome: String,
    val email: String,
    val tipo: String,
)
