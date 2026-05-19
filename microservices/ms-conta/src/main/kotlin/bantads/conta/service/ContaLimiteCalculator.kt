package bantads.conta.service

import java.math.BigDecimal
import java.math.RoundingMode

object ContaLimiteCalculator {

    fun calcularLimitePorSalario(salario: BigDecimal, saldoAtual: BigDecimal): BigDecimal {
        val base = if (salario >= BigDecimal("2000")) {
            salario.divide(BigDecimal.TWO, 2, RoundingMode.HALF_UP)
        } else {
            BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)
        }
        if (saldoAtual < BigDecimal.ZERO) {
            val piso = saldoAtual.abs().setScale(2, RoundingMode.HALF_UP)
            return if (base < piso) piso else base
        }
        return base
    }
}
