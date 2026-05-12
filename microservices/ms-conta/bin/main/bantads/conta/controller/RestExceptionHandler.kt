package bantads.conta.controller

import bantads.conta.exception.ContaInativaException
import bantads.conta.exception.ContaNaoEncontradaException
import bantads.conta.exception.OperacaoInvalidaException
import bantads.conta.exception.SaldoInsuficienteException
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

    @ExceptionHandler(ContaNaoEncontradaException::class)
    fun contaNaoEncontrada(ex: ContaNaoEncontradaException) = respond(HttpStatus.NOT_FOUND, ex.message)

    @ExceptionHandler(ContaInativaException::class)
    fun contaInativa(ex: ContaInativaException) = respond(HttpStatus.CONFLICT, ex.message)

    @ExceptionHandler(SaldoInsuficienteException::class)
    fun saldoInsuficiente(ex: SaldoInsuficienteException) =
        respond(HttpStatus.UNPROCESSABLE_ENTITY, ex.message)

    @ExceptionHandler(OperacaoInvalidaException::class)
    fun operacaoInvalida(ex: OperacaoInvalidaException) = respond(HttpStatus.BAD_REQUEST, ex.message)

    @ExceptionHandler(IllegalArgumentException::class)
    fun illegal(ex: IllegalArgumentException) = respond(HttpStatus.BAD_REQUEST, ex.message)

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
    fun generic(ex: Exception): ResponseEntity<ErrorResponse> {
        logger.error("Erro não tratado em ms-conta", ex)
        return respond(HttpStatus.INTERNAL_SERVER_ERROR, "Erro interno no serviço de contas")
    }

    private fun respond(status: HttpStatus, message: String?): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(status).body(
            ErrorResponse(
                status = status.value(),
                error = status.reasonPhrase,
                message = message,
            ),
        )
}
