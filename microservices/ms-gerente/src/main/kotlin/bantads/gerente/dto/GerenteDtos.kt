package bantads.gerente.dto

import bantads.gerente.util.CpfValido
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import com.fasterxml.jackson.annotation.JsonProperty
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
    @field:Size(max = 20)
    val telefone: String? = null,
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

/** Formato esperado pelo testador oficial DAC (`?filtro=dashboard`). */
data class DacDashboardGerenteRef(
    val cpf: String,
    val nome: String,
)

data class DacDashboardClienteRef(
    val cpf: String,
    val nome: String,
)

data class DacDashboardItem(
    val gerente: DacDashboardGerenteRef,
    val clientes: List<DacDashboardClienteRef>,
    @JsonProperty("saldo_positivo")
    val saldoPositivo: BigDecimal,
    @JsonProperty("saldo_negativo")
    val saldoNegativo: BigDecimal,
)
