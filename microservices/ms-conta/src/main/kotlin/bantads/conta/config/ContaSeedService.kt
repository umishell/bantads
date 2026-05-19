package bantads.conta.config

import bantads.conta.model.Conta
import bantads.conta.repository.ContaRepository
import bantads.conta.repository.MovimentacaoRepository
import jakarta.persistence.EntityManager
import jakarta.persistence.PersistenceContext
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.Instant

@Service
class ContaSeedService(
    private val contaRepository: ContaRepository,
    private val movimentacaoRepository: MovimentacaoRepository,
    @PersistenceContext private val entityManager: EntityManager,
) {

    @Transactional
    fun resetAndSeed(profile: String = "full") {
        movimentacaoRepository.deleteAll()
        contaRepository.deleteAll()
        entityManager.flush()
        entityManager.clear()
        when (profile.lowercase()) {
            "single-gerente" -> seedContaCli1()
            else -> seedFull()
        }
    }

    private fun seedContaCli1() {
        contaRepository.save(
            conta(
                "1291",
                "800.00",
                "5000.00",
                BantadsDevEntityIds.CLIENTE_CLI1,
                BantadsDevEntityIds.GERENTE_GER1,
                "2000-01-01T00:00:00Z",
            ),
        )
    }

    private fun seedFull() {
        seedContaCli1()
        contaRepository.save(
            conta(
                "0950",
                "-10000.00",
                "10000.00",
                BantadsDevEntityIds.CLIENTE_CLI2,
                BantadsDevEntityIds.GERENTE_GER2,
                "1990-10-10T00:00:00Z",
            ),
        )
        contaRepository.save(
            conta(
                "8573",
                "-1000.00",
                "1500.00",
                BantadsDevEntityIds.CLIENTE_CLI3,
                BantadsDevEntityIds.GERENTE_GER3,
                "2012-12-12T00:00:00Z",
            ),
        )
        contaRepository.save(
            conta(
                "5887",
                "150000.00",
                "0.00",
                BantadsDevEntityIds.CLIENTE_CLI4,
                BantadsDevEntityIds.GERENTE_GER1,
                "2022-02-22T00:00:00Z",
            ),
        )
        contaRepository.save(
            conta(
                "7617",
                "1500.00",
                "0.00",
                BantadsDevEntityIds.CLIENTE_CLI5,
                BantadsDevEntityIds.GERENTE_GER2,
                "2025-01-01T00:00:00Z",
            ),
        )
    }

    private fun conta(
        numero: String,
        saldo: String,
        limite: String,
        clienteId: java.util.UUID,
        gerenteId: java.util.UUID,
        criacao: String,
    ) = Conta(
        numero = numero,
        saldo = BigDecimal(saldo),
        limite = BigDecimal(limite),
        clienteId = clienteId,
        gerenteId = gerenteId,
        sagaId = null,
        ativa = true,
        dataCriacao = Instant.parse(criacao),
    )
}
