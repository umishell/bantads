package bantads.cliente.model

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "cliente")
class Cliente(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    var id: UUID? = null,

    @Column(nullable = false, unique = true, length = 11)
    var cpf: String,

    @Column(nullable = false)
    var email: String,

    @Column(nullable = false)
    var nome: String,

    @Column(nullable = false)
    var telefone: String,

    @Column(nullable = false, precision = 14, scale = 2)
    var salario: BigDecimal,

    @Column(nullable = false, length = 255)
    var endereco: String,

    @Column(nullable = false, length = 8)
    var cep: String,

    @Column(nullable = false, length = 120)
    var cidade: String,

    @Column(nullable = false, length = 2)
    var estado: String,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    var status: StatusCliente = StatusCliente.PENDENTE_APROVACAO,

    @Column(length = 2000)
    var motivoRejeicao: String? = null,

    /** Data/hora da decisão do gerente (aprovação solicitada → saga, ou rejeição). R10/R11. */
    var decisaoGerenteEm: Instant? = null,

    @Column(nullable = false)
    var criadoEm: Instant = Instant.now(),
)
