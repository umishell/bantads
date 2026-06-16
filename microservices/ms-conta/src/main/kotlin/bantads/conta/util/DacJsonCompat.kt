package bantads.conta.util

import bantads.conta.model.TipoMovimentacao
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

object DacJsonCompat {
    private val zone = ZoneId.of("America/Sao_Paulo")
    private val formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ssXXX")

    fun formatData(instant: Instant): String =
        instant.atZone(zone).format(formatter)

    fun tipoLabel(tipo: TipoMovimentacao, natureza: String? = null): String =
        when (tipo) {
            TipoMovimentacao.DEPOSITO -> "depósito"
            TipoMovimentacao.SAQUE -> "saque"
            TipoMovimentacao.TRANSFERENCIA -> "transferência"
        }
}
