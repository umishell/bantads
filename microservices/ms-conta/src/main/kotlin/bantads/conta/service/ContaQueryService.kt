package bantads.conta.service

import bantads.conta.dto.AgregadoPorGerenteResponse
import bantads.conta.dto.ContaResponse
import bantads.conta.dto.ExtratoMovimentacaoDacResponse
import bantads.conta.dto.ExtratoResponse
import bantads.conta.dto.LancamentoExtratoResponse
import bantads.conta.dto.SaldoResponse
import bantads.conta.exception.ContaNaoEncontradaException
import bantads.conta.model.Conta
import bantads.conta.model.Movimentacao
import bantads.conta.model.TipoMovimentacao
import bantads.conta.repository.ContaRepository
import bantads.conta.repository.MovimentacaoRepository
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import bantads.conta.util.DacJsonCompat
import java.math.BigDecimal
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
            clienteCpf = c.clienteCpf,
        )
    }

    @Transactional(readOnly = true)
    fun listarPorGerente(gerenteId: UUID): List<ContaResponse> =
        contaRepository.findAllByGerenteIdAndAtivaOrderByNumeroAsc(gerenteId, true)
            .map { it.toResponse() }

    @Transactional(readOnly = true)
    fun listarTodas(): List<ContaResponse> =
        contaRepository.findAllByAtivaOrderByNumeroAsc(true).map { it.toResponse() }

    @Transactional(readOnly = true)
    fun top3PorSaldo(): List<ContaResponse> =
        contaRepository.findTop3ByAtivaOrderBySaldoDesc(true).map { it.toResponse() }

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
    fun extrato(numero: String, inicio: Instant, fim: Instant): ExtratoResponse {
        val conta = contaRepository.findByNumero(numero) ?: throw ContaNaoEncontradaException()
        val contaId = conta.id!!
        val movs = movimentacaoRepository.findExtrato(contaId, inicio, fim)
        val ultimaAntes = movimentacaoRepository
            .findUltimaAntesDe(contaId, inicio, PageRequest.of(0, 1))
            .firstOrNull()
        val saldoInicial = ultimaAntes?.saldoAposParaConta(contaId) ?: BigDecimal.ZERO
        val lancamentos = movs.map { m -> m.toLancamento(contaId) }
        return ExtratoResponse(
            saldoInicial = saldoInicial,
            lancamentos = lancamentos,
            contaNumero = conta.numero,
            saldoFinal = conta.saldo,
            movimentacoesDac = movs.map { m -> m.toDacMovimentacao(conta.numero, contaId) },
        )
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

    private fun Movimentacao.saldoAposParaConta(contaId: UUID): BigDecimal? {
        val ehDestino = contaDestinoId == contaId
        return if (ehDestino) saldoResultanteDestino else saldoResultanteOrigem
    }

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
        val saldoApos = saldoAposParaConta(contaId)
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

    private fun Movimentacao.toDacMovimentacao(contaNumero: String, contaId: UUID): ExtratoMovimentacaoDacResponse {
        val ehDestino = contaDestinoId == contaId
        val ehOrigem = contaOrigemId == contaId
        val (origem, destino) = when (tipo) {
            TipoMovimentacao.DEPOSITO -> contaNumero to ""
            TipoMovimentacao.SAQUE -> contaNumero to ""
            TipoMovimentacao.TRANSFERENCIA -> {
                val origNum = if (ehOrigem) contaNumero else numeroConta(contaOrigemId)
                val destNum = if (ehDestino) contaNumero else numeroConta(contaDestinoId)
                origNum to destNum
            }
        }
        return ExtratoMovimentacaoDacResponse(
            tipo = DacJsonCompat.tipoLabel(tipo),
            origem = origem,
            destino = destino,
            valor = valor,
            data = DacJsonCompat.formatData(dataHora),
        )
    }

    private fun numeroConta(contaUuid: UUID?): String {
        if (contaUuid == null) return ""
        return contaRepository.findById(contaUuid).orElse(null)?.numero ?: ""
    }
}
