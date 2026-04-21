package bantads.conta.controller

import bantads.conta.dto.AtualizarLimiteRequest
import bantads.conta.dto.OperacaoResponse
import bantads.conta.dto.TransferenciaRequest
import bantads.conta.dto.ValorRequest
import bantads.conta.service.ContaCommandService
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * Lado COMMAND do CQRS em ms-conta. Muta saldo, limite e estado de contas.
 * R3: operações de conta (depositar/sacar/transferir). R8: inativação/limite pelo gerente.
 */
@RestController
@RequestMapping
class ContaCommandController(
    private val commandService: ContaCommandService,
) {

    /** R3: Depositar em uma conta. */
    @PostMapping("/{numero}/depositar")
    fun depositar(
        @PathVariable numero: String,
        @Valid @RequestBody body: ValorRequest,
    ): ResponseEntity<OperacaoResponse> =
        ResponseEntity.ok(commandService.depositar(numero, body))

    /** R3: Sacar de uma conta (respeitando saldo + limite). */
    @PostMapping("/{numero}/sacar")
    fun sacar(
        @PathVariable numero: String,
        @Valid @RequestBody body: ValorRequest,
    ): ResponseEntity<OperacaoResponse> =
        ResponseEntity.ok(commandService.sacar(numero, body))

    /** R3: Transferir entre contas. */
    @PostMapping("/{numero}/transferir")
    fun transferir(
        @PathVariable numero: String,
        @Valid @RequestBody body: TransferenciaRequest,
    ): ResponseEntity<OperacaoResponse> =
        ResponseEntity.ok(commandService.transferir(numero, body))

    /** R8: Gerente atualiza limite da conta. */
    @PatchMapping("/{numero}/limite")
    fun atualizarLimite(
        @PathVariable numero: String,
        @Valid @RequestBody body: AtualizarLimiteRequest,
    ): ResponseEntity<Void> {
        commandService.atualizarLimite(numero, body.limite)
        return ResponseEntity.noContent().build()
    }

    /** R8: Gerente encerra/inativa a conta (soft delete, preservando auditoria). */
    @DeleteMapping("/{numero}")
    fun encerrar(@PathVariable numero: String): ResponseEntity<Void> {
        commandService.encerrar(numero)
        return ResponseEntity.noContent().build()
    }
}
