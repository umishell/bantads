package bantads.cliente.controller

import bantads.cliente.exception.CpfJaCadastradoException
import bantads.cliente.exception.EstadoClienteInvalidoException
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

data class ErrorBody(
    val status: Int,
    val error: String,
    val message: String,
    val fieldErrors: Map<String, String>? = null,
)

@RestControllerAdvice
class RestExceptionHandler {

    @ExceptionHandler(CpfJaCadastradoException::class)
    fun cpfDuplicado(ex: CpfJaCadastradoException): ResponseEntity<ErrorBody> =
        ResponseEntity.status(HttpStatus.CONFLICT).body(
            ErrorBody(
                status = HttpStatus.CONFLICT.value(),
                error = "Conflict",
                message = ex.message ?: "Conflito",
            ),
        )

    @ExceptionHandler(EstadoClienteInvalidoException::class)
    fun estadoCliente(ex: EstadoClienteInvalidoException): ResponseEntity<ErrorBody> =
        ResponseEntity.status(HttpStatus.CONFLICT).body(
            ErrorBody(
                status = HttpStatus.CONFLICT.value(),
                error = "Conflict",
                message = ex.message ?: "Estado inválido para a operação",
            ),
        )

    @ExceptionHandler(IllegalArgumentException::class)
    fun illegalArgument(ex: IllegalArgumentException): ResponseEntity<ErrorBody> =
        ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
            ErrorBody(
                status = HttpStatus.BAD_REQUEST.value(),
                error = "Bad Request",
                message = ex.message ?: "Requisição inválida",
            ),
        )

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun validation(ex: MethodArgumentNotValidException): ResponseEntity<ErrorBody> {
        val fields = ex.bindingResult.fieldErrors.associate { fe ->
            fe.field to (fe.defaultMessage ?: "inválido")
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
            ErrorBody(
                status = HttpStatus.BAD_REQUEST.value(),
                error = "Bad Request",
                message = "Dados de entrada inválidos",
                fieldErrors = fields,
            ),
        )
    }
}
