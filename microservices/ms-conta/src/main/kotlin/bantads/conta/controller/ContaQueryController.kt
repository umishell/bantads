package bantads.conta.controller

import bantads.conta.dto.AgregadoPorGerenteResponse
import bantads.conta.dto.ContaResponse
import bantads.conta.dto.ExtratoResponse
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
@RestController
@RequestMapping
class ContaQueryController(
    private val queryService: ContaQueryService,
) {

    @GetMapping("/{numero}")
    fun obter(@PathVariable numero: String): ResponseEntity<ContaResponse> =
        ResponseEntity.ok(queryService.buscarPorNumero(numero))

    @GetMapping("/por-cliente/{clienteId}")
    fun obterPorCliente(@PathVariable clienteId: UUID): ResponseEntity<ContaResponse> =
        ResponseEntity.ok(queryService.buscarPorClienteId(clienteId))

    @GetMapping("/{numero}/saldo")
    fun saldo(@PathVariable numero: String): ResponseEntity<SaldoResponse> =
        ResponseEntity.ok(queryService.saldo(numero))

    @GetMapping("/{numero}/extrato")
    fun extrato(
        @PathVariable numero: String,
        @RequestParam(required = false)
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) dataInicio: LocalDate?,
        @RequestParam(required = false)
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) dataFim: LocalDate?,
    ): ResponseEntity<ExtratoResponse> {
        val zona = ZoneId.of("America/Sao_Paulo")
        val hoje = LocalDate.now(zona)
        val inicio = (dataInicio ?: hoje.minusDays(30)).atStartOfDay(zona).toInstant()
        val fim = (dataFim ?: hoje).plusDays(1).atStartOfDay(zona).toInstant().minusMillis(1)
        return ResponseEntity.ok(queryService.extrato(numero, inicio, fim))
    }

    @GetMapping
    fun listar(
        @RequestParam(required = false) gerenteId: UUID?,
    ): ResponseEntity<List<ContaResponse>> =
        if (gerenteId != null) {
            ResponseEntity.ok(queryService.listarPorGerente(gerenteId))
        } else {
            ResponseEntity.ok(queryService.listarTodas())
        }

    @GetMapping("/top3")
    fun top3(): ResponseEntity<List<ContaResponse>> =
        ResponseEntity.ok(queryService.top3PorSaldo())

    @GetMapping("/agregados/por-gerente")
    fun agregadosPorGerente(): ResponseEntity<List<AgregadoPorGerenteResponse>> =
        ResponseEntity.ok(queryService.agregadosPorGerente())
}
