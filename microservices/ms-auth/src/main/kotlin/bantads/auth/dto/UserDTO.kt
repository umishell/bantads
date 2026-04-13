package bantads.auth.dto

// (autocadastro/saga) Payload recebido na fila RabbitMQ para criação de usuário
data class UserDTO(
    val email: String,
    val senha: String,
    val nome: String,
    val cpf: String? = null,
)
