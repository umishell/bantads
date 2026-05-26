package bantads.conta.repository

import bantads.conta.model.Movimentacao
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.Instant
import java.util.UUID

interface MovimentacaoRepository : JpaRepository<Movimentacao, UUID> {

    @Query(
        """
        SELECT m FROM Movimentacao m
        WHERE (m.contaOrigemId = :contaId OR m.contaDestinoId = :contaId)
          AND m.dataHora BETWEEN :inicio AND :fim
        ORDER BY m.dataHora DESC
        """,
    )
    fun findExtrato(
        @Param("contaId") contaId: UUID,
        @Param("inicio") inicio: Instant,
        @Param("fim") fim: Instant,
    ): List<Movimentacao>

    @Query(
        """
        SELECT m FROM Movimentacao m
        WHERE (m.contaOrigemId = :contaId OR m.contaDestinoId = :contaId)
          AND m.dataHora < :inicio
        ORDER BY m.dataHora DESC
        """,
    )
    fun findUltimaAntesDe(
        @Param("contaId") contaId: UUID,
        @Param("inicio") inicio: Instant,
        pageable: Pageable,
    ): List<Movimentacao>
}
