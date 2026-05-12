package bantads.gerente.repository

import bantads.gerente.model.Gerente
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface GerenteRepository : JpaRepository<Gerente, UUID> {
    fun findAllByAtivoTrueOrderByCpfAsc(): List<Gerente>
    fun findAllByAtivoTrueAndTipoOrderByCpfAsc(tipo: String): List<Gerente>
    fun findAllByAtivoTrueAndTipoOrderByNomeAsc(tipo: String): List<Gerente>
    fun findByCpf(cpf: String): Gerente?
    fun existsByCpf(cpf: String): Boolean
    fun countByAtivoTrueAndTipo(tipo: String): Long
}
