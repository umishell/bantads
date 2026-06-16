package bantads.conta.service

import bantads.conta.dto.OperacaoResponse
import bantads.conta.dto.TransferenciaRequest
import bantads.conta.exception.ContaInativaException
import bantads.conta.exception.ContaNaoEncontradaException
import bantads.conta.exception.OperacaoInvalidaException
import bantads.conta.exception.SaldoInsuficienteException
import bantads.conta.messaging.ContaSagaCommandPublisher
import bantads.conta.messaging.TransferSagaResponseAwaiter
import bantads.conta.model.TipoMovimentacao
import com.fasterxml.jackson.databind.JsonNode
import org.springframework.stereotype.Service
import java.time.Instant
import java.util.UUID
@Service
class TransferenciaSagaCoordinator(
    private val commands: ContaSagaCommandPublisher,
    private val awaiter: TransferSagaResponseAwaiter,
) {
    private val timeoutSeconds = 30L

    fun transferir(numeroContaOrigem: String, req: TransferenciaRequest): OperacaoResponse {
        val sagaId = UUID.randomUUID().toString()
        val corrDebito = UUID.randomUUID().toString()
        commands.publish(
            mapOf(
                "command" to "CONTA_TRANSFER_DEBIT",
                "correlationId" to corrDebito,
                "sagaId" to sagaId,
                "numeroOrigem" to numeroContaOrigem,
                "numeroDestino" to req.resolveNumeroContaDestino(),
                "valor" to req.valor.toPlainString(),
            ),
        )
        val debito = awaiter.await(corrDebito, timeoutSeconds)
        if (!debito.path("success").asBoolean(false)) {
            throw mapErro(debito)
        }

        val corrCredito = UUID.randomUUID().toString()
        commands.publish(
            mapOf(
                "command" to "CONTA_TRANSFER_CREDIT",
                "correlationId" to corrCredito,
                "sagaId" to sagaId,
            ),
        )
        val credito = awaiter.await(corrCredito, timeoutSeconds)
        if (!credito.path("success").asBoolean(false)) {
            throw mapErro(credito)
        }
        return mapOperacao(credito)
    }

    private fun mapErro(node: JsonNode): RuntimeException {
        val msg = node.path("error").asText("Falha na transferência")
        return when {
            msg.contains("não encontrada", ignoreCase = true) ||
                msg.contains("nao encontrada", ignoreCase = true) ->
                ContaNaoEncontradaException(msg)
            msg.contains("inativa", ignoreCase = true) -> ContaInativaException(msg)
            msg.contains("insuficiente", ignoreCase = true) -> SaldoInsuficienteException(msg)
            msg.contains("iguais", ignoreCase = true) -> OperacaoInvalidaException(msg)
            else -> IllegalStateException(msg)
        }
    }

    private fun mapOperacao(node: JsonNode): OperacaoResponse =
        OperacaoResponse(
            movimentacaoId = UUID.fromString(node.path("movimentacaoId").asText()),
            tipo = TipoMovimentacao.TRANSFERENCIA,
            valor = node.path("valor").decimalValue(),
            saldoOrigem = jsonDecimalOrNull(node, "saldoOrigem"),
            saldoDestino = jsonDecimalOrNull(node, "saldoDestino"),
            dataHora = Instant.parse(node.path("dataHora").asText()),
        )

    private fun jsonDecimalOrNull(node: JsonNode, field: String): java.math.BigDecimal? {
        val value = node.path(field)
        if (value.isMissingNode || value.isNull) return null
        return value.decimalValue()
    }
}
