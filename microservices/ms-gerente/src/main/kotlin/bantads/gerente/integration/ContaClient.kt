package bantads.gerente.integration

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.math.BigDecimal
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.Duration
import java.util.UUID

/**
 * Cliente HTTP para o ms-conta — consulta read-side (CQRS) para agregações usadas
 * pelo dashboard do administrador (R15) e outras telas administrativas.
 * Em caso de falha, retorna lista vazia para manter o dashboard resiliente.
 */
@Component
class ContaClient(
    @Value("\${bantads.conta-service.base-url}") private val baseUrl: String,
    private val objectMapper: ObjectMapper,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    private val httpClient: HttpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(3))
        .build()

    fun agregadosPorGerente(): List<AgregadoGerenteDto> {
        return tryGet("$baseUrl/agregados/por-gerente") { body ->
            objectMapper.readValue(body, Array<AgregadoGerenteDto>::class.java).toList()
        } ?: emptyList()
    }

    /** R18 — remanejamento de contas antes do soft delete do gerente. */
    fun remanejarContasDoGerente(gerenteRemovidoId: UUID, outrosGerentesAtivosIds: List<UUID>): Int {
        val body = mapOf(
            "gerenteRemovidoId" to gerenteRemovidoId.toString(),
            "outrosGerentesAtivosIds" to outrosGerentesAtivosIds.map { it.toString() },
        )
        val resp = tryPost("$baseUrl/operacoes/gerente/remanejar", body) ?: return 0
        return (resp["contasRemanejadas"] as? Number)?.toInt() ?: 0
    }

    /** R17 — atribui uma conta ao novo gerente conforme regras do enunciado. */
    fun atribuirUmaContaAoNovoGerente(novoGerenteId: UUID, gerentesAtivosIds: List<UUID>): Boolean {
        val body = mapOf(
            "novoGerenteId" to novoGerenteId.toString(),
            "gerentesAtivosIds" to gerentesAtivosIds.map { it.toString() },
        )
        val resp = tryPost("$baseUrl/operacoes/gerente/atribuir-uma-conta", body) ?: return false
        return resp["atribuida"] as? Boolean ?: false
    }

    private fun tryPost(url: String, body: Map<String, Any>): Map<String, Any>? {
        val json = objectMapper.writeValueAsString(body)
        val req = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .timeout(Duration.ofSeconds(10))
            .header("Content-Type", "application/json")
            .header("Accept", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(json))
            .build()
        return try {
            val resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString())
            if (resp.statusCode() in 200..299) {
                @Suppress("UNCHECKED_CAST")
                objectMapper.readValue(resp.body(), Map::class.java) as Map<String, Any>
            } else {
                log.warn("ms-conta POST status={} url={} body={}", resp.statusCode(), url, resp.body())
                null
            }
        } catch (ex: Exception) {
            log.warn("Falha POST ms-conta {}: {}", url, ex.message)
            null
        }
    }

    private fun <T> tryGet(url: String, parser: (String) -> T): T? {
        val req = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .timeout(Duration.ofSeconds(5))
            .header("Accept", "application/json")
            .GET()
            .build()
        return try {
            val resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString())
            if (resp.statusCode() in 200..299) {
                parser(resp.body())
            } else {
                log.warn("ms-conta respondeu status={} para {}", resp.statusCode(), url)
                null
            }
        } catch (ex: Exception) {
            log.warn("Falha ao chamar ms-conta {}: {}", url, ex.message)
            null
        }
    }
}

@JsonIgnoreProperties(ignoreUnknown = true)
data class AgregadoGerenteDto(
    val gerenteId: UUID,
    val totalClientes: Long,
    val somaSaldosPositivos: BigDecimal,
    val somaSaldosNegativos: BigDecimal,
)
