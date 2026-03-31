package bantads.auth.dto

/** Payload recebido na fila RabbitMQ para criação de usuário (SAGA). */
data class UserDTO(
    val email: String,
    val senha: String,
    val nome: String,
    val cpf: String? = null,
)
