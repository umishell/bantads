package bantads.cliente.dto

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.Size
import java.math.BigDecimal

/** R13 — alteração de dados cadastrais do cliente (PUT /clientes/{cpf}). */
data class AlterarPerfilClienteRequest(
    @field:Size(min = 3, max = 200)
    val nome: String? = null,
    @field:Email
    val email: String? = null,
    @field:Size(min = 8, max = 20)
    val telefone: String? = null,
    val salario: BigDecimal? = null,
    @field:Size(max = 255)
    val endereco: String? = null,
    @field:Size(max = 120)
    val cidade: String? = null,
    @field:Size(min = 2, max = 2)
    val estado: String? = null,
    @field:Size(min = 8, max = 8)
    val cep: String? = null,
)
