package bantads.gerente.controller

import bantads.gerente.config.GerenteSeedService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/integration")
class IntegrationRebootController(
    private val seedService: GerenteSeedService,
) {
    @PostMapping("/reboot")
    fun reboot(@RequestParam(defaultValue = "full") profile: String): ResponseEntity<Map<String, String>> {
        seedService.resetAndSeed(profile)
        return ResponseEntity.ok(mapOf("service" to "ms-gerente", "profile" to profile, "status" to "ok"))
    }
}
