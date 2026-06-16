package bantads.gerente.dto

import bantads.gerente.util.CpfValido
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import java.math.BigDecimal
import java.util.UUID
data class GerenteResponse(
    val id: UUID,
    val cpf: String,
    val nome: String,
    val email: String,
    val telefone: String,
    val tipo: String,
    val ativo: Boolean,
)
data class InserirGerenteRequest(
    @field:NotBlank
    @field:CpfValido
    val cpf: String,
    @field:NotBlank
    @field:Size(min = 3, max = 200)
    val nome: String,
    @field:NotBlank
    @field:Email
    val email: String,
    @field:NotBlank
    @field:Size(min = 8, max = 20)
    val telefone: String,
    @field:NotBlank
    @field:Size(min = 4, max = 64)
    val senha: String,
    val tipo: String? = "GERENTE",
)
data class AlterarGerenteRequest(
    @field:Size(min = 3, max = 200)
    val nome: String? = null,
    @field:Email
    val email: String? = null,
    @field:Size(min = 4, max = 64)
    val senha: String? = null,
)
data class DashboardGerenteItem(
    val gerenteId: UUID,
    val cpf: String,
    val nome: String,
    val email: String,
    val totalClientes: Long,
    val somaSaldosPositivos: BigDecimal,
    val somaSaldosNegativos: BigDecimal,
)
