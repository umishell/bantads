package bantads.auth.controller

import bantads.auth.dto.AlterarSenhaInternoRequest
import bantads.auth.dto.CriarUsuarioInternoRequest
import bantads.auth.dto.RemoverUsuarioInternoRequest
import bantads.auth.service.AuthService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

/**
 * Operações internas entre microserviços (sem exposição pelo gateway público).
 */
@RestController
@RequestMapping("/internal")
class AuthInternalController(
    private val authService: AuthService,
) {

    @GetMapping("/usuarios/existe")
    fun loginExiste(@RequestParam login: String): ResponseEntity<Map<String, Boolean>> {
        val existe = authService.findUserByLogin(login) != null
        return ResponseEntity.ok(mapOf("existe" to existe))
    }

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

    /** R20 — atualização síncrona de senha a partir do ms-gerente. */
    @PatchMapping("/usuarios/senha")
    fun alterarSenha(@Valid @RequestBody body: AlterarSenhaInternoRequest): ResponseEntity<Map<String, Boolean>> {
        val ok = authService.atualizarSenhaPorLogin(body.email, body.senha)
        return if (ok) {
            ResponseEntity.ok(mapOf("atualizado" to true))
        } else {
            ResponseEntity.status(HttpStatus.NOT_FOUND).body(mapOf("atualizado" to false))
        }
    }
}
