package bantads.conta.controller

import bantads.conta.dto.AgregadoPorGerenteResponse
import bantads.conta.dto.ContaResponse
import bantads.conta.dto.LancamentoExtratoResponse
import bantads.conta.dto.SaldoResponse
import bantads.conta.service.ContaQueryService
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDate
import java.time.ZoneId
import java.util.UUID

/**
 * Lado QUERY do CQRS em ms-conta. Somente leitura; consome modelo de leitura.
 * R5 extrato; R6 saldo; R7 consultas; R8 listagem de contas por gerente.
 */
@RestController
@RequestMapping
class ContaQueryController(
    private val queryService: ContaQueryService,
) {

    /** R7: consulta por número. */
    @GetMapping("/{numero}")
    fun obter(@PathVariable numero: String): ResponseEntity<ContaResponse> =
        ResponseEntity.ok(queryService.buscarPorNumero(numero))

    /** R7: consulta por cliente (clienteId). */
    @GetMapping("/por-cliente/{clienteId}")
    fun obterPorCliente(@PathVariable clienteId: UUID): ResponseEntity<ContaResponse> =
        ResponseEntity.ok(queryService.buscarPorClienteId(clienteId))

    /** R6: saldo + limite + saldoDisponivel. */
    @GetMapping("/{numero}/saldo")
    fun saldo(@PathVariable numero: String): ResponseEntity<SaldoResponse> =
        ResponseEntity.ok(queryService.saldo(numero))

    /** R5: extrato por período (default últimos 30 dias). */
    @GetMapping("/{numero}/extrato")
    fun extrato(
        @PathVariable numero: String,
        @RequestParam(required = false)
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) dataInicio: LocalDate?,
        @RequestParam(required = false)
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) dataFim: LocalDate?,
    ): ResponseEntity<List<LancamentoExtratoResponse>> {
        val zona = ZoneId.of("America/Sao_Paulo")
        val hoje = LocalDate.now(zona)
        val inicio = (dataInicio ?: hoje.minusDays(30)).atStartOfDay(zona).toInstant()
        val fim = (dataFim ?: hoje).plusDays(1).atStartOfDay(zona).toInstant().minusMillis(1)
        return ResponseEntity.ok(queryService.extrato(numero, inicio, fim))
    }

    /** R7/R8: lista todas as contas ativas (administrador/gerente). */
    @GetMapping
    fun listar(
        @RequestParam(required = false) gerenteId: UUID?,
    ): ResponseEntity<List<ContaResponse>> =
        if (gerenteId != null) {
            ResponseEntity.ok(queryService.listarPorGerente(gerenteId))
        } else {
            ResponseEntity.ok(queryService.listarTodas())
        }

    /** R14: top 3 clientes com maiores saldos (qualquer gerente). */
    @GetMapping("/top3")
    fun top3(): ResponseEntity<List<ContaResponse>> =
        ResponseEntity.ok(queryService.top3PorSaldo())

    /** R15: agregados por gerente — consumido pelo ms-gerente no dashboard do admin. */
    @GetMapping("/agregados/por-gerente")
    fun agregadosPorGerente(): ResponseEntity<List<AgregadoPorGerenteResponse>> =
        ResponseEntity.ok(queryService.agregadosPorGerente())
}
