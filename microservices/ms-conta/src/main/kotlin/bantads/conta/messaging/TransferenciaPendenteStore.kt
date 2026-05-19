package bantads.conta.messaging

import java.math.BigDecimal
import org.springframework.stereotype.Component
import java.util.concurrent.ConcurrentHashMap

data class TransferenciaPendente(
    val numeroOrigem: String,
    val numeroDestino: String,
    val valor: BigDecimal,
    val saldoOrigemAposDebito: BigDecimal,
)

@Component
class TransferenciaPendenteStore {
    private val porSaga = ConcurrentHashMap<String, TransferenciaPendente>()

    fun put(sagaId: String, pendente: TransferenciaPendente) {
        porSaga[sagaId] = pendente
    }

    fun remove(sagaId: String): TransferenciaPendente? = porSaga.remove(sagaId)

    fun get(sagaId: String): TransferenciaPendente? = porSaga[sagaId]
}
