package bantads.conta.service

import bantads.conta.exception.ContaNaoEncontradaException
import bantads.conta.repository.ContaRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.util.UUID

/**
 * R17/R18 — regras de atribuição e remanejamento de contas entre gerentes.
 */
@Service
class ContaGerenteOperacoesService(
    private val contaRepository: ContaRepository,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    /**
     * R18: todas as contas ativas do gerente removido passam para o gerente com menos clientes.
     */
    @Transactional
    fun remanejarContasDoGerente(gerenteRemovidoId: UUID, outrosGerentesAtivosIds: List<UUID>): Int {
        if (outrosGerentesAtivosIds.isEmpty()) return 0
        val destinoId = escolherGerenteComMenosContas(outrosGerentesAtivosIds)
            ?: return 0
        val contas = contaRepository.findAllByGerenteIdAndAtivaOrderByNumeroAsc(gerenteRemovidoId, true)
        contas.forEach { c ->
            c.gerenteId = destinoId
            contaRepository.save(c)
        }
        log.info(
            "R18 remanejamento: {} contas de gerente {} → gerente {}",
            contas.size,
            gerenteRemovidoId,
            destinoId,
        )
        return contas.size
    }

    /**
     * R17: novo gerente recebe uma conta do gerente que possui mais clientes;
     * em empate de quantidade, do gerente com menor soma de saldos positivos.
     */
    @Transactional
    fun atribuirUmaContaAoNovoGerente(novoGerenteId: UUID, gerentesAtivosIds: List<UUID>): Boolean {
        val candidatos = gerentesAtivosIds.filter { it != novoGerenteId }
        if (candidatos.isEmpty()) return false

        val contagens = candidatos.associateWith { gid ->
            contaRepository.countByGerenteIdAndAtiva(gid, true)
        }
        val max = contagens.values.maxOrNull() ?: 0L
        if (max == 0L) return false

        val comMax = candidatos.filter { contagens[it] == max }
        val origemId = escolherGerenteComMenorSomaSaldoPositivo(comMax) ?: comMax.first()
        val contasOrigem = contaRepository.findAllByGerenteIdAndAtivaOrderByNumeroAsc(origemId, true)
        val conta = contasOrigem.firstOrNull() ?: return false
        conta.gerenteId = novoGerenteId
        contaRepository.save(conta)
        log.info("R17 atribuição: conta {} transferida de gerente {} → {}", conta.numero, origemId, novoGerenteId)
        return true
    }

    @Transactional
    fun recalcularLimitePorCliente(clienteId: UUID, novoSalario: BigDecimal): BigDecimal {
        val conta = contaRepository.findByClienteId(clienteId)
            ?: throw ContaNaoEncontradaException("Conta não encontrada para o cliente")
        val novoLimite = ContaLimiteCalculator.calcularLimitePorSalario(novoSalario, conta.saldo)
        conta.limite = novoLimite
        contaRepository.save(conta)
        log.info("R4 limite recalculado cliente={} conta={} limite={}", clienteId, conta.numero, novoLimite)
        return novoLimite
    }

    private fun escolherGerenteComMenosContas(gerenteIds: List<UUID>): UUID? {
        if (gerenteIds.isEmpty()) return null
        return gerenteIds.minWithOrNull(
            compareBy<UUID> { contaRepository.countByGerenteIdAndAtiva(it, true) }
                .thenBy { it.toString() },
        )
    }

    private fun escolherGerenteComMenorSomaSaldoPositivo(gerenteIds: List<UUID>): UUID? {
        if (gerenteIds.isEmpty()) return null
        return gerenteIds.minWithOrNull(
            compareBy<UUID> { gid ->
                somaSaldosPositivos(gid)
            }.thenBy { it.toString() },
        )
    }

    private fun somaSaldosPositivos(gerenteId: UUID): BigDecimal =
        contaRepository.findAllByGerenteIdAndAtivaOrderByNumeroAsc(gerenteId, true)
            .map { it.saldo }
            .filter { it > BigDecimal.ZERO }
            .fold(BigDecimal.ZERO) { acc, v -> acc + v }
}
