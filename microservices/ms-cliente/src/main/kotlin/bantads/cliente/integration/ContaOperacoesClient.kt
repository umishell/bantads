package bantads.cliente.integration

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient
import java.math.BigDecimal
import java.util.UUID

/** Chamadas internas ao ms-conta (R4 — recálculo de limite). */
@Component
class ContaOperacoesClient(
    @Value("\${bantads.integration.conta-base-url}") private val contaBaseUrl: String,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    private val rest = RestClient.builder().build()

    fun recalcularLimite(clienteId: UUID, salario: BigDecimal) {
        val url = "$contaBaseUrl/operacoes/cliente/$clienteId/recalcular-limite"
        try {
            rest.post()
                .uri(url)
                .contentType(MediaType.APPLICATION_JSON)
                .body(mapOf("salario" to salario))
                .retrieve()
                .toBodilessEntity()
        } catch (ex: Exception) {
            log.warn("Falha ao recalcular limite cliente={}: {}", clienteId, ex.message)
        }
    }
}
