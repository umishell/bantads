package bantads.cliente.dto

import bantads.cliente.util.CpfValido
import com.fasterxml.jackson.annotation.JsonProperty
import jakarta.validation.constraints.DecimalMin
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import java.math.BigDecimal

data class AutocadastroRequest(
    @field:NotBlank(message = "CPF é obrigatório")
    @field:Size(min = 11, max = 14, message = "CPF inválido")
    @field:CpfValido
    val cpf: String,

    @field:NotBlank
    @field:Email(message = "E-mail inválido")
    val email: String,

    @field:NotBlank
    @field:Size(max = 200)
    val nome: String,

    @field:NotBlank
    @field:Size(max = 20)
    val telefone: String,

    @field:NotNull
    @field:DecimalMin(value = "0.01", inclusive = true, message = "Salário deve ser maior que zero")
    val salario: BigDecimal,

    @field:NotBlank
    @field:Size(max = 255)
    val endereco: String,

    @param:JsonProperty("CEP")
    @field:NotBlank
    @field:Size(min = 8, max = 9, message = "CEP inválido")
    val cep: String,

    @field:NotBlank
    @field:Size(max = 120)
    val cidade: String,

    @field:NotBlank
    @field:Pattern(regexp = "^[A-Za-z]{2}$", message = "Estado deve ser a sigla UF com 2 letras")
    val estado: String,
)
