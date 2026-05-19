package bantads.conta.controller

import bantads.conta.service.ContaGerenteOperacoesService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.math.BigDecimal
import java.util.UUID

/** Endpoints server-to-server (ms-gerente / ms-cliente). */
@RestController
@RequestMapping("/operacoes")
class ContaOperacoesInternasController(
    private val gerenteOperacoes: ContaGerenteOperacoesService,
) {

    @PostMapping("/gerente/remanejar")
    fun remanejar(@RequestBody body: RemanejarContasRequest): ResponseEntity<RemanejarContasResponse> {
        val qtd = gerenteOperacoes.remanejarContasDoGerente(
            UUID.fromString(body.gerenteRemovidoId),
            body.outrosGerentesAtivosIds.map { UUID.fromString(it) },
        )
        return ResponseEntity.ok(RemanejarContasResponse(contasRemanejadas = qtd))
    }

    @PostMapping("/gerente/atribuir-uma-conta")
    fun atribuirUma(@RequestBody body: AtribuirContaRequest): ResponseEntity<AtribuirContaResponse> {
        val ok = gerenteOperacoes.atribuirUmaContaAoNovoGerente(
            UUID.fromString(body.novoGerenteId),
            body.gerentesAtivosIds.map { UUID.fromString(it) },
        )
        return ResponseEntity.ok(AtribuirContaResponse(atribuida = ok))
    }

    @PostMapping("/cliente/{clienteId}/recalcular-limite")
    fun recalcularLimite(
        @PathVariable clienteId: UUID,
        @RequestBody body: RecalcularLimiteRequest,
    ): ResponseEntity<RecalcularLimiteResponse> {
        val limite = gerenteOperacoes.recalcularLimitePorCliente(clienteId, body.salario)
        return ResponseEntity.ok(RecalcularLimiteResponse(limite = limite))
    }
}

data class RemanejarContasRequest(
    val gerenteRemovidoId: String,
    val outrosGerentesAtivosIds: List<String>,
)

data class RemanejarContasResponse(val contasRemanejadas: Int)

data class AtribuirContaRequest(
    val novoGerenteId: String,
    val gerentesAtivosIds: List<String>,
)

data class AtribuirContaResponse(val atribuida: Boolean)

data class RecalcularLimiteRequest(val salario: BigDecimal)

data class RecalcularLimiteResponse(val limite: BigDecimal)
