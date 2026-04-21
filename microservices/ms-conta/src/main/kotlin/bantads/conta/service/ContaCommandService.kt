package bantads.conta.service

import bantads.conta.dto.OperacaoResponse
import bantads.conta.dto.TransferenciaRequest
import bantads.conta.dto.ValorRequest
import bantads.conta.exception.ContaInativaException
import bantads.conta.exception.ContaNaoEncontradaException
import bantads.conta.exception.OperacaoInvalidaException
import bantads.conta.exception.SaldoInsuficienteException
import bantads.conta.model.Conta
import bantads.conta.model.Movimentacao
import bantads.conta.model.TipoMovimentacao
import bantads.conta.repository.ContaRepository
import bantads.conta.repository.MovimentacaoRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.Instant

@Service
class ContaCommandService(
    private val contaRepository: ContaRepository,
    private val movimentacaoRepository: MovimentacaoRepository,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @Transactional
    fun depositar(numeroConta: String, req: ValorRequest): OperacaoResponse {
        val conta = exigirContaAtiva(numeroConta)
        val valor = req.valor.normalizar()
        conta.saldo = conta.saldo + valor
        contaRepository.save(conta)

        val mov = movimentacaoRepository.save(
            Movimentacao(
                dataHora = Instant.now(),
                tipo = TipoMovimentacao.DEPOSITO,
                valor = valor,
                contaDestinoId = conta.id,
                saldoResultanteDestino = conta.saldo,
            ),
        )
        log.info("Depósito conta={} valor={} novoSaldo={}", numeroConta, valor, conta.saldo)
        return OperacaoResponse(
            movimentacaoId = mov.id!!,
            tipo = mov.tipo,
            valor = mov.valor,
            saldoOrigem = null,
            saldoDestino = conta.saldo,
            dataHora = mov.dataHora,
        )
    }

    @Transactional
    fun sacar(numeroConta: String, req: ValorRequest): OperacaoResponse {
        val conta = exigirContaAtiva(numeroConta)
        val valor = req.valor.normalizar()
        val disponivel = conta.saldo + conta.limite
        if (valor > disponivel) {
            throw SaldoInsuficienteException(
                "Saldo+limite insuficiente (disponível=$disponivel, solicitado=$valor)",
            )
        }
        conta.saldo = conta.saldo - valor
        contaRepository.save(conta)

        val mov = movimentacaoRepository.save(
            Movimentacao(
                dataHora = Instant.now(),
                tipo = TipoMovimentacao.SAQUE,
                valor = valor,
                contaOrigemId = conta.id,
                saldoResultanteOrigem = conta.saldo,
            ),
        )
        log.info("Saque conta={} valor={} novoSaldo={}", numeroConta, valor, conta.saldo)
        return OperacaoResponse(
            movimentacaoId = mov.id!!,
            tipo = mov.tipo,
            valor = mov.valor,
            saldoOrigem = conta.saldo,
            saldoDestino = null,
            dataHora = mov.dataHora,
        )
    }

    @Transactional
    fun transferir(numeroContaOrigem: String, req: TransferenciaRequest): OperacaoResponse {
        if (numeroContaOrigem == req.numeroContaDestino) {
            throw OperacaoInvalidaException("Conta de origem e destino são iguais")
        }
        val origem = exigirContaAtiva(numeroContaOrigem)
        val destino = exigirContaAtiva(req.numeroContaDestino)
        val valor = req.valor.normalizar()
        val disponivel = origem.saldo + origem.limite
        if (valor > disponivel) {
            throw SaldoInsuficienteException(
                "Saldo+limite insuficiente (disponível=$disponivel, solicitado=$valor)",
            )
        }
        origem.saldo = origem.saldo - valor
        destino.saldo = destino.saldo + valor
        contaRepository.save(origem)
        contaRepository.save(destino)

        val mov = movimentacaoRepository.save(
            Movimentacao(
                dataHora = Instant.now(),
                tipo = TipoMovimentacao.TRANSFERENCIA,
                valor = valor,
                contaOrigemId = origem.id,
                contaDestinoId = destino.id,
                saldoResultanteOrigem = origem.saldo,
                saldoResultanteDestino = destino.saldo,
            ),
        )
        log.info(
            "Transferência origem={} destino={} valor={} saldoOrigem={} saldoDestino={}",
            origem.numero, destino.numero, valor, origem.saldo, destino.saldo,
        )
        return OperacaoResponse(
            movimentacaoId = mov.id!!,
            tipo = mov.tipo,
            valor = mov.valor,
            saldoOrigem = origem.saldo,
            saldoDestino = destino.saldo,
            dataHora = mov.dataHora,
        )
    }

    @Transactional
    fun atualizarLimite(numeroConta: String, novoLimite: BigDecimal) {
        val conta = exigirContaAtiva(numeroConta)
        conta.limite = novoLimite.setScale(2)
        contaRepository.save(conta)
        log.info("Limite atualizado conta={} limite={}", numeroConta, conta.limite)
    }

    @Transactional
    fun encerrar(numeroConta: String) {
        val conta = contaRepository.findByNumero(numeroConta)
            ?: throw ContaNaoEncontradaException()
        conta.ativa = false
        contaRepository.save(conta)
        log.info("Conta encerrada (inativação lógica) numero={}", numeroConta)
    }

    private fun exigirContaAtiva(numero: String): Conta {
        val c = contaRepository.findByNumero(numero)
            ?: throw ContaNaoEncontradaException()
        if (!c.ativa) throw ContaInativaException()
        return c
    }

    private fun BigDecimal.normalizar(): BigDecimal = this.setScale(2)
}
