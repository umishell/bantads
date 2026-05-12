package bantads.cliente.util

import jakarta.validation.Constraint
import jakarta.validation.ConstraintValidator
import jakarta.validation.ConstraintValidatorContext
import jakarta.validation.Payload
import kotlin.reflect.KClass

@Target(AnnotationTarget.FIELD, AnnotationTarget.VALUE_PARAMETER)
@Retention(AnnotationRetention.RUNTIME)
@Constraint(validatedBy = [CpfValidoValidator::class])
annotation class CpfValido(
    val message: String = "CPF inválido",
    val groups: Array<KClass<*>> = [],
    val payload: Array<KClass<out Payload>> = [],
)

class CpfValidoValidator : ConstraintValidator<CpfValido, String> {
    override fun isValid(value: String?, context: ConstraintValidatorContext?): Boolean =
        value != null && Cpf.isValid(value)
}
