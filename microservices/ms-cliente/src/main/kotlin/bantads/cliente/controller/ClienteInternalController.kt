package bantads.cliente.controller

import bantads.cliente.dto.ClienteResumoInterno
import bantads.cliente.repository.ClienteRepository
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.util.UUID
@RestController
@RequestMapping("/internal")
class ClienteInternalController(
    private val repository: ClienteRepository,
) {

    @GetMapping("/emails/existe")
    fun emailExiste(@RequestParam email: String): ResponseEntity<Map<String, Boolean>> {
        val existe = repository.existsByEmailIgnoreCase(email.trim().lowercase())
        return ResponseEntity.ok(mapOf("existe" to existe))
    }

    @GetMapping("/clientes/resumo")
    fun resumoPorIds(@RequestParam ids: List<UUID>): ResponseEntity<List<ClienteResumoInterno>> {
        val found = repository.findAllById(ids).map { c ->
            ClienteResumoInterno(cpf = c.cpf, nome = c.nome)
        }
        return ResponseEntity.ok(found)
    }
}
