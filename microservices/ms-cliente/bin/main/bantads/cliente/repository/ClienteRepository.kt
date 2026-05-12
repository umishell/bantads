package bantads.cliente.repository

import bantads.cliente.model.Cliente
import bantads.cliente.model.StatusCliente
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface ClienteRepository : JpaRepository<Cliente, UUID> {
    fun existsByCpf(cpf: String): Boolean
    fun findByCpf(cpf: String): Cliente?
    fun findAllByStatusOrderByCriadoEmAsc(status: StatusCliente): List<Cliente>
}
