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
