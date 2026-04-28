package bantads.conta.dto

import bantads.conta.model.TipoMovimentacao
import jakarta.validation.constraints.DecimalMin
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Pattern
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

/** R7: resposta de consulta e detalhes. */
data class ContaResponse(
    val id: UUID,
    val numero: String,
    val clienteId: UUID,
    val gerenteId: UUID,
    val saldo: BigDecimal,
    val limite: BigDecimal,
    val ativa: Boolean,
    val dataCriacao: Instant,
)

/** R6: resposta de saldo enxuta. */
data class SaldoResponse(
    val numero: String,
    val saldo: BigDecimal,
    val limite: BigDecimal,
    val saldoDisponivel: BigDecimal,
)

/** R3: operações command requests. */
data class ValorRequest(
    @field:NotNull
    @field:DecimalMin(value = "0.01", inclusive = true, message = "valor deve ser maior que zero")
    val valor: BigDecimal,
)

data class TransferenciaRequest(
    @field:NotBlank
    @field:Pattern(regexp = "^[0-9]{4}$", message = "numeroContaDestino deve ter 4 dígitos")
    val numeroContaDestino: String,
    @field:NotNull
    @field:DecimalMin(value = "0.01", inclusive = true, message = "valor deve ser maior que zero")
    val valor: BigDecimal,
)

/** R3: resposta após operação command. */
data class OperacaoResponse(
    val movimentacaoId: UUID,
    val tipo: TipoMovimentacao,
    val valor: BigDecimal,
    val saldoOrigem: BigDecimal?,
    val saldoDestino: BigDecimal?,
    val dataHora: Instant,
)

/** R5: item de extrato (um lançamento visto pela conta consultada). */
data class LancamentoExtratoResponse(
    val movimentacaoId: UUID,
    val dataHora: Instant,
    val tipo: TipoMovimentacao,
    val natureza: String,
    val valor: BigDecimal,
    val saldoApos: BigDecimal?,
    val contraparteContaNumero: String?,
)

/** R8: atualização de limite pelo gerente. */
data class AtualizarLimiteRequest(
    @field:NotNull
    @field:DecimalMin(value = "0.00", inclusive = true, message = "limite não pode ser negativo")
    val limite: BigDecimal,
)
