package bantads.conta.service

import bantads.conta.dto.AgregadoPorGerenteResponse
import bantads.conta.dto.ContaResponse
import bantads.conta.dto.LancamentoExtratoResponse
import bantads.conta.dto.SaldoResponse
import bantads.conta.exception.ContaNaoEncontradaException
import bantads.conta.model.Conta
import bantads.conta.model.Movimentacao
import bantads.conta.model.TipoMovimentacao
import bantads.conta.repository.ContaRepository
import bantads.conta.repository.MovimentacaoRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

@Service
class ContaQueryService(
    private val contaRepository: ContaRepository,
    private val movimentacaoRepository: MovimentacaoRepository,
) {

    @Transactional(readOnly = true)
    fun buscarPorNumero(numero: String): ContaResponse =
        contaRepository.findByNumero(numero)?.toResponse()
            ?: throw ContaNaoEncontradaException()

    @Transactional(readOnly = true)
    fun buscarPorClienteId(clienteId: UUID): ContaResponse =
        contaRepository.findByClienteId(clienteId)?.toResponse()
            ?: throw ContaNaoEncontradaException("Cliente não possui conta")

    @Transactional(readOnly = true)
    fun saldo(numero: String): SaldoResponse {
        val c = contaRepository.findByNumero(numero) ?: throw ContaNaoEncontradaException()
        return SaldoResponse(
            numero = c.numero,
            saldo = c.saldo,
            limite = c.limite,
            saldoDisponivel = c.saldo + c.limite,
        )
    }

    @Transactional(readOnly = true)
    fun listarPorGerente(gerenteId: UUID): List<ContaResponse> =
        contaRepository.findAllByGerenteIdAndAtivaOrderByNumeroAsc(gerenteId, true)
            .map { it.toResponse() }

    @Transactional(readOnly = true)
    fun listarTodas(): List<ContaResponse> =
        contaRepository.findAllByAtivaOrderByNumeroAsc(true).map { it.toResponse() }

    /** R14: top 3 clientes com maiores saldos. */
    @Transactional(readOnly = true)
    fun top3PorSaldo(): List<ContaResponse> =
        contaRepository.findTop3ByAtivaOrderBySaldoDesc(true).map { it.toResponse() }

    /** R15: agregados por gerente (usado pelo dashboard do administrador). */
    @Transactional(readOnly = true)
    fun agregadosPorGerente(): List<AgregadoPorGerenteResponse> =
        contaRepository.agregadoPorGerente().map { p ->
            AgregadoPorGerenteResponse(
                gerenteId = p.getGerenteId(),
                totalClientes = p.getTotalClientes(),
                somaSaldosPositivos = p.getSomaPositivos(),
                somaSaldosNegativos = p.getSomaNegativos(),
            )
        }

    @Transactional(readOnly = true)
    fun extrato(numero: String, inicio: Instant, fim: Instant): List<LancamentoExtratoResponse> {
        val conta = contaRepository.findByNumero(numero) ?: throw ContaNaoEncontradaException()
        val movs = movimentacaoRepository.findExtrato(conta.id!!, inicio, fim)
        return movs.map { m -> m.toLancamento(conta.id!!) }
    }

    private fun Conta.toResponse(): ContaResponse = ContaResponse(
        id = id!!,
        numero = numero,
        clienteId = clienteId,
        gerenteId = gerenteId,
        saldo = saldo,
        limite = limite,
        ativa = ativa,
        dataCriacao = dataCriacao,
    )

    private fun Movimentacao.toLancamento(contaId: UUID): LancamentoExtratoResponse {
        val ehDestino = contaDestinoId == contaId
        val ehOrigem = contaOrigemId == contaId
        val natureza = when {
            tipo == TipoMovimentacao.DEPOSITO && ehDestino -> "ENTRADA"
            tipo == TipoMovimentacao.SAQUE && ehOrigem -> "SAIDA"
            tipo == TipoMovimentacao.TRANSFERENCIA && ehDestino -> "ENTRADA"
            tipo == TipoMovimentacao.TRANSFERENCIA && ehOrigem -> "SAIDA"
            else -> "SAIDA"
        }
        val saldoApos = if (ehDestino) saldoResultanteDestino else saldoResultanteOrigem
        val contraparteId = if (ehDestino) contaOrigemId else contaDestinoId
        return LancamentoExtratoResponse(
            movimentacaoId = id!!,
            dataHora = dataHora,
            tipo = tipo,
            natureza = natureza,
            valor = valor,
            saldoApos = saldoApos,
            contraparteContaNumero = contraparteId?.let { cid ->
                contaRepository.findById(cid).orElse(null)?.numero
            },
        )
    }
}
