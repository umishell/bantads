package bantads.gerente.model

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.util.UUID

@Entity
@Table(name = "gerente")
class Gerente(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    var id: UUID? = null,

    @Column(nullable = false, unique = true, length = 11)
    var cpf: String,

    @Column(nullable = false, length = 200)
    var nome: String,

    @Column(nullable = false, length = 200)
    var email: String,

    @Column(nullable = false, length = 20)
    var telefone: String = "",

    /** GERENTE | ADMINISTRADOR */
    @Column(nullable = false, length = 20)
    var tipo: String = "GERENTE",

    @Column(nullable = false)
    var ativo: Boolean = true,
)
