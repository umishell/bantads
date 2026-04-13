package bantads.conta.model

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "conta")
class Conta(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    var id: UUID? = null,

    @Column(nullable = false, unique = true, length = 4)
    var numero: String,

    @Column(nullable = false, precision = 14, scale = 2)
    var saldo: BigDecimal = BigDecimal.ZERO,

    @Column(nullable = false, precision = 14, scale = 2)
    var limite: BigDecimal = BigDecimal.ZERO,

    @Column(nullable = false)
    var clienteId: UUID,

    @Column(nullable = false)
    var gerenteId: UUID,

    @Column(unique = true)
    var sagaId: UUID? = null,

    @Column(nullable = false)
    var ativa: Boolean = true,

    @Column(nullable = false)
    var dataCriacao: Instant = Instant.now(),
)
