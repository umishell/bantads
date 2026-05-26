package bantads.cliente.integration

import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.net.URI
import java.net.URLEncoder
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.nio.charset.StandardCharsets
import java.time.Duration

@Component
class GerenteClient(
    @Value("\${bantads.integration.gerente-base-url}") private val baseUrl: String,
    private val objectMapper: ObjectMapper,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    private val httpClient: HttpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(3))
        .build()

    fun emailExiste(email: String): Boolean {
        val normalized = email.trim().lowercase()
        val encoded = URLEncoder.encode(normalized, StandardCharsets.UTF_8)
        val req = HttpRequest.newBuilder()
            .uri(URI.create("$baseUrl/internal/emails/existe?email=$encoded"))
            .timeout(Duration.ofSeconds(5))
            .header("Accept", "application/json")
            .GET()
            .build()
        return try {
            val resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString())
            if (resp.statusCode() != 200) {
                log.warn("ms-gerente GET emails/existe status={} body={}", resp.statusCode(), resp.body())
                return false
            }
            objectMapper.readTree(resp.body()).path("existe").asBoolean(false)
        } catch (ex: Exception) {
            log.warn("ms-gerente indisponível ao verificar e-mail: {}", ex.message)
            false
        }
    }
}
