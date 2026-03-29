package bantads.auth.controller

import bantads.auth.dto.LoginRequest
import bantads.auth.dto.LoginResponse
import bantads.auth.dto.LogoutResponse
import bantads.auth.service.AuthService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException

@RestController
class AuthController(
    private val authService: AuthService,
) {

    @PostMapping("/login")
    fun login(@Valid @RequestBody request: LoginRequest): ResponseEntity<LoginResponse> {
        return ResponseEntity.ok(authService.autenticar(request))
    }

    @PostMapping("/logout")
    fun logout(
        @RequestHeader(value = "Authorization", required = false) authorization: String?,
    ): ResponseEntity<LogoutResponse> {
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
        return ResponseEntity.ok(authService.logout(token))
    }
}
