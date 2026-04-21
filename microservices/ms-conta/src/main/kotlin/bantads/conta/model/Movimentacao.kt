package bantads.conta.model

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.Table
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

@Entity
@Table(
    name = "movimentacao",
    indexes = [
        Index(name = "idx_mov_conta_origem_data", columnList = "contaOrigemId,dataHora"),
        Index(name = "idx_mov_conta_destino_data", columnList = "contaDestinoId,dataHora"),
    ],
)
class Movimentacao(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    var id: UUID? = null,

    @Column(nullable = false)
    var dataHora: Instant = Instant.now(),

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    var tipo: TipoMovimentacao,

    @Column(nullable = false, precision = 14, scale = 2)
    var valor: BigDecimal,

    @Column
    var contaOrigemId: UUID? = null,

    @Column
    var contaDestinoId: UUID? = null,

    /** Saldo da conta origem após a operação (para SAQUE/TRANSFERENCIA/DEPOSITO na própria conta). */
    @Column(precision = 14, scale = 2)
    var saldoResultanteOrigem: BigDecimal? = null,

    /** Saldo da conta destino após a operação (apenas TRANSFERENCIA e DEPOSITO em conta alvo). */
    @Column(precision = 14, scale = 2)
    var saldoResultanteDestino: BigDecimal? = null,
)
