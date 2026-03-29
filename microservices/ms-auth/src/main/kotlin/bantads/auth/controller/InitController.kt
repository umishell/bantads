package bantads.auth.controller

import bantads.auth.service.AuthSeedService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

@RestController
class InitController(
    private val authSeedService: AuthSeedService,
) {

    /** Swagger: inicializa o banco com os dados da especificação. */
    @GetMapping("/reboot")
    fun reboot(): ResponseEntity<Map<String, String>> {
        authSeedService.seed()
        return ResponseEntity.ok(mapOf("message" to "Banco de dados criado conforme especificação"))
    }
}
