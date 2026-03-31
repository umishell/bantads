package bantads.conta.repository

import bantads.conta.model.Conta
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface ContaRepository : JpaRepository<Conta, UUID> {
    fun countByGerenteIdAndAtiva(gerenteId: UUID, ativa: Boolean): Long
    fun existsByNumero(numero: String): Boolean
    fun findBySagaId(sagaId: UUID): Conta?
}
