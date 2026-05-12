package bantads.gerente.controller

import bantads.gerente.dto.AlterarGerenteRequest
import bantads.gerente.dto.DashboardGerenteItem
import bantads.gerente.dto.GerenteResponse
import bantads.gerente.dto.InserirGerenteRequest
import bantads.gerente.service.GerenteService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping
class GerenteController(
    private val service: GerenteService,
) {

    /** R19: lista gerentes por nome ASC. */
    @GetMapping
    fun listar(): ResponseEntity<List<GerenteResponse>> =
        ResponseEntity.ok(service.listar())

    /** R15: dashboard do administrador. */
    @GetMapping("/stats")
    fun dashboard(): ResponseEntity<List<DashboardGerenteItem>> =
        ResponseEntity.ok(service.dashboard())

    @GetMapping("/{cpf}")
    fun obter(@PathVariable cpf: String): ResponseEntity<GerenteResponse> =
        ResponseEntity.ok(service.obterPorCpf(cpf))

    /** R17: inserção. */
    @PostMapping
    fun inserir(@Valid @RequestBody body: InserirGerenteRequest): ResponseEntity<GerenteResponse> =
        ResponseEntity.status(HttpStatus.CREATED).body(service.inserir(body))

    /** R20: alteração. */
    @PutMapping("/{cpf}")
    fun alterar(
        @PathVariable cpf: String,
        @Valid @RequestBody body: AlterarGerenteRequest,
    ): ResponseEntity<GerenteResponse> =
        ResponseEntity.ok(service.alterar(cpf, body))

    /** R18: remoção (soft delete). */
    @DeleteMapping("/{cpf}")
    fun remover(@PathVariable cpf: String): ResponseEntity<GerenteResponse> =
        ResponseEntity.ok(service.remover(cpf))
}
