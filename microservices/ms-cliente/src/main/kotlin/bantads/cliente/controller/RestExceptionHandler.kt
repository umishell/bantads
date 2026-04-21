package bantads.cliente.controller

import bantads.cliente.exception.CpfJaCadastradoException
import bantads.cliente.exception.EstadoClienteInvalidoException
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import java.time.LocalDateTime

data class ErrorResponse(
    val timestamp: LocalDateTime = LocalDateTime.now(),
    val status: Int,
    val error: String,
    val message: String?,
    val fieldErrors: Map<String, String>? = null,
)

@RestControllerAdvice
class RestExceptionHandler {

    private val logger = LoggerFactory.getLogger(javaClass)

    @ExceptionHandler(CpfJaCadastradoException::class)
    fun cpfDuplicado(ex: CpfJaCadastradoException): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(HttpStatus.CONFLICT).body(
            ErrorResponse(
                status = HttpStatus.CONFLICT.value(),
                error = "Conflict",
                message = ex.message ?: "Conflito",
            ),
        )

    @ExceptionHandler(EstadoClienteInvalidoException::class)
    fun estadoCliente(ex: EstadoClienteInvalidoException): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(HttpStatus.CONFLICT).body(
            ErrorResponse(
                status = HttpStatus.CONFLICT.value(),
                error = "Conflict",
                message = ex.message ?: "Estado inválido para a operação",
            ),
        )

    @ExceptionHandler(IllegalArgumentException::class)
    fun illegalArgument(ex: IllegalArgumentException): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
            ErrorResponse(
                status = HttpStatus.BAD_REQUEST.value(),
                error = "Bad Request",
                message = ex.message ?: "Requisição inválida",
            ),
        )

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun validation(ex: MethodArgumentNotValidException): ResponseEntity<ErrorResponse> {
        val fields = ex.bindingResult.fieldErrors.associate { fe ->
            fe.field to (fe.defaultMessage ?: "inválido")
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
            ErrorResponse(
                status = HttpStatus.BAD_REQUEST.value(),
                error = "Bad Request",
                message = "Dados de entrada inválidos",
                fieldErrors = fields,
            ),
        )
    }

    @ExceptionHandler(Exception::class)
    fun handleGenericErrors(ex: Exception): ResponseEntity<ErrorResponse> {
        logger.error("Erro não tratado em ms-cliente", ex)
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
            ErrorResponse(
                status = HttpStatus.INTERNAL_SERVER_ERROR.value(),
                error = "Internal Server Error",
                message = "Ocorreu um erro interno no serviço de clientes.",
            ),
        )
    }
}
