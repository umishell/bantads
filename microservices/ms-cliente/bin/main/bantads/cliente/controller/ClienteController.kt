package bantads.cliente.controller

import bantads.cliente.dto.AprovarClienteRequest
import bantads.cliente.dto.AutocadastroRequest
import bantads.cliente.dto.AutocadastroResponse
import bantads.cliente.dto.ClientePendenteListItemResponse
import bantads.cliente.dto.RejeitarClienteRequest
import bantads.cliente.service.ClienteService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping
class ClienteController(
    private val clienteService: ClienteService,
) {

    /** R1 — autocadastro público (gateway: POST /api/clientes). */
    @PostMapping(consumes = [MediaType.APPLICATION_JSON_VALUE], produces = [MediaType.APPLICATION_JSON_VALUE])
    @ResponseStatus(HttpStatus.CREATED)
    fun autocadastro(@Valid @RequestBody body: AutocadastroRequest): AutocadastroResponse =
        clienteService.autocadastro(body)

    /** Lista autocadastros pendentes — gateway exige JWT GERENTE. */
    @GetMapping("/pendentes", produces = [MediaType.APPLICATION_JSON_VALUE])
    fun pendentes(): List<ClientePendenteListItemResponse> = clienteService.listarPendentes()

    @PostMapping("/{id}/aprovar", consumes = [MediaType.APPLICATION_JSON_VALUE])
    @ResponseStatus(HttpStatus.ACCEPTED)
    fun aprovar(
        @PathVariable id: UUID,
        @RequestBody(required = false) body: AprovarClienteRequest?,
    ) {
        clienteService.aprovar(id, body ?: AprovarClienteRequest())
    }

    @PostMapping("/{id}/rejeitar", consumes = [MediaType.APPLICATION_JSON_VALUE])
    @ResponseStatus(HttpStatus.OK)
    fun rejeitar(
        @PathVariable id: UUID,
        @Valid @RequestBody body: RejeitarClienteRequest,
    ) {
        clienteService.rejeitar(id, body)
    }
}
