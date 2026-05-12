package bantads.conta.repository

import bantads.conta.model.Conta
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import java.util.UUID

interface ContaRepository : JpaRepository<Conta, UUID> {
    fun countByGerenteIdAndAtiva(gerenteId: UUID, ativa: Boolean): Long
    fun existsByNumero(numero: String): Boolean
    fun findBySagaId(sagaId: UUID): Conta?
    fun findByNumero(numero: String): Conta?
    fun findByClienteId(clienteId: UUID): Conta?
    fun findAllByGerenteIdAndAtivaOrderByNumeroAsc(gerenteId: UUID, ativa: Boolean): List<Conta>
    fun findAllByAtivaOrderByNumeroAsc(ativa: Boolean): List<Conta>
    fun findTop3ByAtivaOrderBySaldoDesc(ativa: Boolean): List<Conta>

    /**
     * Projeção para R15 (dashboard do administrador): totais agregados por gerente,
     * considerando apenas contas ativas.
     * Retorna tuplas (gerenteId, totalClientes, somaPositivos, somaNegativos).
     */
    @Query(
        """
        SELECT c.gerenteId AS gerenteId,
               COUNT(c) AS totalClientes,
               COALESCE(SUM(CASE WHEN c.saldo > 0 THEN c.saldo ELSE 0 END), 0) AS somaPositivos,
               COALESCE(SUM(CASE WHEN c.saldo < 0 THEN c.saldo ELSE 0 END), 0) AS somaNegativos
        FROM Conta c
        WHERE c.ativa = true
        GROUP BY c.gerenteId
        """,
    )
    fun agregadoPorGerente(): List<AgregadoPorGerenteProjection>
}

interface AgregadoPorGerenteProjection {
    fun getGerenteId(): UUID
    fun getTotalClientes(): Long
    fun getSomaPositivos(): java.math.BigDecimal
    fun getSomaNegativos(): java.math.BigDecimal
}
