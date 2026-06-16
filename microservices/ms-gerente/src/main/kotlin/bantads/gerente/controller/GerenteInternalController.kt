package bantads.gerente.controller

import bantads.gerente.repository.GerenteRepository
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
@RestController
@RequestMapping("/internal")
class GerenteInternalController(
    private val repository: GerenteRepository,
) {

    @GetMapping("/emails/existe")
    fun emailExiste(@RequestParam email: String): ResponseEntity<Map<String, Boolean>> {
        val existe = repository.existsByEmailIgnoreCase(email.trim().lowercase())
        return ResponseEntity.ok(mapOf("existe" to existe))
    }
}
