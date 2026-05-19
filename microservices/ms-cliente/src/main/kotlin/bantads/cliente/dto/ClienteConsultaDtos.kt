package bantads.cliente.dto

import bantads.cliente.model.StatusCliente
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

/** Linha do relatório administrativo (alinhado ao front `AdminRelatorioClienteModel`). */
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
)

/** Detalhe de cliente por CPF (consulta gerente / cliente). */
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
    /** R11 — motivo informado pelo gerente na rejeição (quando aplicável). */
    val motivoRejeicao: String? = null,
    /** R11 — data/hora da decisão do gerente (aprovação ou rejeição). */
    val decisaoGerenteEm: Instant? = null,
)

/** Carteira do gerente / listagens com conta (alinhado ao front `ClienteCarteiraModel`). */
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
