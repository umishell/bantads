package bantads.auth.dto

/** Alinhado ao Swagger (cpf, nome, email, tipo). */
data class LogoutResponse(
    val cpf: String,
    val nome: String,
    val email: String,
    val tipo: String,
)
