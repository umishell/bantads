package br.ufpr.bantads.ms_auth.controller

import br.ufpr.bantads.ms_auth.dto.LoginRequest
import br.ufpr.bantads.ms_auth.dto.LoginResponse
import br.ufpr.bantads.ms_auth.service.AuthService
import org.springframework.web.bind.annotation.*
import org.springframework.http.ResponseEntity
import com.bantads.auth.dto.LogoutResponse

@RestController
@RequestMapping("/login")
class AuthController(private val authService: AuthService) {

    @PostMapping
    fun login(@Valid @RequestBody request: LoginRequest): ResponseEntity<LoginResponse> {
        val response = authService.autenticar(request)
        return ResponseEntity.ok(response)
    }

    @PostMapping("/logout")
    fun logout(): ResponseEntity<LogoutResponse> {
        // Como o JWT é stateless, apenas confirmamos o recebimento da intenção
        val response = authService.logout()
        return ResponseEntity.ok(response)
    }
}