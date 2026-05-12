package bantads.conta.config

import java.util.UUID

/** Mesmos UUIDs que `ms-cliente` / `ms-gerente` (seed de desenvolvimento). */
object BantadsDevEntityIds {
    val CLIENTE_CLI1: UUID = UUID.fromString("f1111111-1111-4111-8111-111111111101")
    val CLIENTE_CLI2: UUID = UUID.fromString("f1111111-1111-4111-8111-111111111102")

    val GERENTE_GER1: UUID = UUID.fromString("f2222222-2222-4222-8222-222222222201")
    val GERENTE_GER2: UUID = UUID.fromString("f2222222-2222-4222-8222-222222222202")
}
