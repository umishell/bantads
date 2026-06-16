package bantads.cliente.dto

import bantads.cliente.model.StatusCliente
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID
data class AdminRelatorioClienteResponse(
    val cpfCliente: String,
    val nomeCliente: String,
    val emailCliente: String,
    val salario: BigDecimal,
    val numeroConta: String,
    val saldo: BigDecimal,
    val limite: BigDecimal,
    val cpfGerente: String,
    val nomeGerente: String,
) {
    /** Alias esperado pelo testador oficial DAC (`cli["cpf"]`). */
    val cpf: String get() = cpfCliente

    /** Alias esperado pelo testador oficial DAC (`cli["nome"]`). */
    val nome: String get() = nomeCliente
}

data class ClienteDetalheResponse(
    val id: UUID,
    val cpf: String,
    val nome: String,
    val email: String,
    val telefone: String,
    val salario: BigDecimal,
    val cidade: String,
    val estado: String,
    val endereco: String,
    val cep: String,
    val status: StatusCliente,
    val motivoRejeicao: String? = null,
    val decisaoGerenteEm: Instant? = null,
    val gerenteCpf: String? = null,
    val gerenteNome: String? = null,
    val gerenteEmail: String? = null,
    val conta: String? = null,
    val limite: BigDecimal? = null,
    val saldo: BigDecimal? = null,
) {
    /** Alias DAC (`r["gerente"]`). */
    val gerente: String? get() = gerenteCpf
}
data class ClienteCarteiraListItemResponse(
    val cpf: String,
    val nome: String,
    val email: String,
    val telefone: String,
    val cidade: String,
    val estado: String,
    val endereco: String,
    val salario: BigDecimal,
    val conta: String,
    val agencia: String,
    val saldo: BigDecimal,
    val limite: BigDecimal,
    val situacao: String,
    val gerenteCpf: String,
    val gerenteNome: String,
    val gerenteEmail: String? = null,
    val cep: String? = null,
)
