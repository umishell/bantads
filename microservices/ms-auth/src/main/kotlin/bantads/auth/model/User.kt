package bantads.auth.model

import org.springframework.data.annotation.Id
import org.springframework.data.mongodb.core.index.Indexed
import org.springframework.data.mongodb.core.mapping.Document

@Document(collection = "usuarios")
data class User(
    @Id val id: String? = null,

    @Indexed(unique = true)
    val login: String,

    val senhaHash: String,
    val salt: String,
    val nome: String,
    val cpf: String,
    /** CLIENTE | GERENTE | ADMINISTRADOR */
    val perfil: String,
)
