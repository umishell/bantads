package bantads.cliente.util

/**
 * Utilitário para normalização e validação de CPF brasileiro (formato e dígitos verificadores).
 *
 * Regras:
 *  - Remove caracteres não numéricos.
 *  - Deve resultar em exatamente 11 dígitos.
 *  - Rejeita sequências repetidas (000..., 111..., ..., 999...).
 *  - Valida os 2 dígitos verificadores conforme algoritmo oficial (módulo 11).
 */
object Cpf {

    fun normalize(raw: String): String = raw.filter { it.isDigit() }

    fun isValid(raw: String): Boolean {
        val cpf = normalize(raw)
        if (cpf.length != 11) return false
        if (cpf.all { it == cpf[0] }) return false
        return dv(cpf.substring(0, 9)) == cpf.substring(9, 11)
    }

    fun require(raw: String, field: String = "cpf"): String {
        require(isValid(raw)) { "$field inválido" }
        return normalize(raw)
    }

    private fun dv(nove: String): String {
        val digitos = nove.map { it.digitToInt() }
        val d1 = calcDv(digitos, 10)
        val d2 = calcDv(digitos + d1, 11)
        return "$d1$d2"
    }

    private fun calcDv(base: List<Int>, pesoInicial: Int): Int {
        var peso = pesoInicial
        var soma = 0
        for (n in base) {
            soma += n * peso
            peso--
        }
        val resto = soma % 11
        return if (resto < 2) 0 else 11 - resto
    }
}
