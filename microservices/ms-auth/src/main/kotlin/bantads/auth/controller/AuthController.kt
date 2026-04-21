package bantads.auth.controller

import bantads.auth.dto.LoginRequest
import bantads.auth.dto.LoginResponse
import bantads.auth.dto.LogoutResponse
import bantads.auth.security.JwtService
import bantads.auth.service.AuthService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException

@RestController
class AuthController(
    private val authService: AuthService,
    private val jwtService: JwtService,
) {

    @PostMapping("/login")
    fun login(@Valid @RequestBody request: LoginRequest): ResponseEntity<LoginResponse> {
        return ResponseEntity.ok(authService.autenticar(request))
    }

    @PostMapping("/logout")
    fun logout(
        @RequestHeader(value = "Authorization", required = false) authorization: String?,
    ): ResponseEntity<LogoutResponse> {
        val token = extractBearer(authorization)
        return ResponseEntity.ok(authService.logout(token))
    }

    /**
     * Introspecção de token para consumo interno (gateway/outros MS).
     * Retorna 200 com claims se o token for válido e não revogado; 401 caso contrário.
     */
    @GetMapping("/introspect")
    fun introspect(
        @RequestHeader(value = "Authorization", required = false) authorization: String?,
    ): ResponseEntity<Map<String, Any?>> {
        val token = extractBearer(authorization)
        if (!jwtService.isTokenValido(token)) {
            throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token inválido, expirado ou revogado")
        }
        val claims = jwtService.getClaims(token)
        return ResponseEntity.ok(
            mapOf(
                "active" to true,
                "subject" to claims.subject,
                "perfil" to claims.get("perfil", String::class.java),
                "expiraEm" to claims.expiration.toInstant().toString(),
            ),
        )
    }

    private fun extractBearer(authorization: String?): String {
        val raw = authorization?.trim().orEmpty()
        if (raw.isBlank()) {
            throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Header Authorization obrigatório")
        }
        val token = if (raw.startsWith("Bearer ", ignoreCase = true)) {
            raw.substring(7).trim()
        } else {
            raw
        }
        if (token.isBlank()) {
            throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token Bearer obrigatório")
        }
        return token
    }
}
