package bantads.cliente.config

import java.util.UUID

/**
 * IDs estáveis para seed de desenvolvimento / Docker (alinha ms-cliente ↔ ms-conta).
 */
object BantadsDevEntityIds {
    val CLIENTE_CLI1: UUID = UUID.fromString("f1111111-1111-4111-8111-111111111101")
    val CLIENTE_CLI2: UUID = UUID.fromString("f1111111-1111-4111-8111-111111111102")
}
