package bantads.conta.dto

import bantads.conta.model.TipoMovimentacao
import bantads.conta.util.DacJsonCompat
import jakarta.validation.constraints.DecimalMin
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Pattern
import com.fasterxml.jackson.annotation.JsonProperty
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

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

data class SaldoResponse(
    val numero: String,
    val saldo: BigDecimal,
    val limite: BigDecimal,
    val saldoDisponivel: BigDecimal,
    val clienteCpf: String? = null,
) {
    /** Alias testador DAC (`resp["cliente"]`). */
    val cliente: String? get() = clienteCpf

    /** Alias testador DAC (`resp["conta"]`). */
    val conta: String get() = numero
}

data class ValorRequest(
    @field:NotNull
    @field:DecimalMin(value = "0.01", inclusive = true, message = "valor deve ser maior que zero")
    val valor: BigDecimal,
)

data class TransferenciaRequest(
    @JsonProperty("numeroContaDestino")
    val numeroContaDestino: String? = null,
    @JsonProperty("destino")
    val destino: String? = null,
    @field:NotNull
    @field:DecimalMin(value = "0.01", inclusive = true, message = "valor deve ser maior que zero")
    val valor: BigDecimal,
) {
    fun resolveNumeroContaDestino(): String {
        val n = numeroContaDestino?.trim()?.takeIf { it.isNotEmpty() }
            ?: destino?.trim()?.takeIf { it.isNotEmpty() }
            ?: throw IllegalArgumentException("destino é obrigatório")
        require(n.matches(Regex("^[0-9]{4}$"))) { "numeroContaDestino deve ter 4 dígitos" }
        return n
    }
}

data class OperacaoResponse(
    val movimentacaoId: UUID,
    val tipo: TipoMovimentacao,
    val valor: BigDecimal,
    val saldoOrigem: BigDecimal?,
    val saldoDestino: BigDecimal?,
    val dataHora: Instant,
    val contaNumero: String? = null,
    val destinoNumero: String? = null,
    val saldoCompat: BigDecimal? = null,
) {
    val conta: String? get() = contaNumero
    val destino: String? get() = destinoNumero
    val saldo: BigDecimal? get() = saldoCompat
    val data: String get() = DacJsonCompat.formatData(dataHora)
}

data class ExtratoMovimentacaoDacResponse(
    val tipo: String,
    val origem: String,
    val destino: String,
    val valor: BigDecimal,
    val data: String,
)

data class ExtratoResponse(
    val saldoInicial: BigDecimal,
    val lancamentos: List<LancamentoExtratoResponse>,
    val contaNumero: String? = null,
    val saldoFinal: BigDecimal? = null,
    val movimentacoesDac: List<ExtratoMovimentacaoDacResponse>? = null,
) {
    val conta: String? get() = contaNumero
    val saldo: BigDecimal? get() = saldoFinal
    val movimentacoes: List<ExtratoMovimentacaoDacResponse>? get() = movimentacoesDac
}

data class LancamentoExtratoResponse(
    val movimentacaoId: UUID,
    val dataHora: Instant,
    val tipo: TipoMovimentacao,
    val natureza: String,
    val valor: BigDecimal,
    val saldoApos: BigDecimal?,
    val contraparteContaNumero: String?,
)

data class AtualizarLimiteRequest(
    @field:NotNull
    @field:DecimalMin(value = "0.00", inclusive = true, message = "limite não pode ser negativo")
    val limite: BigDecimal,
)
