package bantads.auth.controller

import bantads.auth.dto.CriarUsuarioInternoRequest
import bantads.auth.dto.RemoverUsuarioInternoRequest
import bantads.auth.service.AuthService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * Operações internas entre microserviços (sem exposição pelo gateway público).
 */
@RestController
@RequestMapping("/internal")
class AuthInternalController(
    private val authService: AuthService,
) {

    @PostMapping("/usuarios")
    fun criar(@Valid @RequestBody body: CriarUsuarioInternoRequest): ResponseEntity<Map<String, Boolean>> {
        val criado = authService.criarUsuarioBackoffice(
            email = body.email,
            nome = body.nome,
            cpf = body.cpf,
            senha = body.senha,
            perfil = body.perfil,
        )
        return if (criado) {
            ResponseEntity.status(HttpStatus.CREATED).body(mapOf("criado" to true))
        } else {
            ResponseEntity.status(HttpStatus.CONFLICT).body(mapOf("criado" to false))
        }
    }

    @DeleteMapping("/usuarios")
    fun remover(@Valid @RequestBody body: RemoverUsuarioInternoRequest): ResponseEntity<Void> {
        authService.removerUsuarioPorLogin(body.email)
        return ResponseEntity.noContent().build()
    }
}
