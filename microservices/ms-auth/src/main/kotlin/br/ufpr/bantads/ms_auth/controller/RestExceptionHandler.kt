package br.ufpr.bantads.ms_auth.controller

import br.ufpr.bantads.ms_auth.dto.ErrorResponse
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.ControllerAdvice
import org.springframework.web.bind.annotation.ExceptionHandler
import java.time.LocalDateTime

@ControllerAdvice
class RestExceptionHandler {

    // 1. Captura erros específicos de Autenticação (Login/Senha errados)
    // Se você lançar 'Exception("Usuário ou senha inválidos")' no Service, ele cai aqui
    @ExceptionHandler(IllegalAccessException::class, NoSuchElementException::class)
    fun handleAuthErrors(e: Exception): ResponseEntity<ErrorResponse> {
        val error = ErrorResponse(
            status = HttpStatus.UNAUTHORIZED.value(),
            error = "Unauthorized",
            message = e.message
        )
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error)
    }

    // 2. Captura TODO o resto (Erros de servidor, banco fora, etc)
    // Isso evita que o seu microsserviço exponha detalhes técnicos (stacktrace) no JSON
    @ExceptionHandler(Exception::class)
    fun handleGenericErrors(e: Exception): ResponseEntity<ErrorResponse> {
        val error = ErrorResponse(
            status = HttpStatus.INTERNAL_SERVER_ERROR.value(),
            error = "Internal Server Error",
            message = "Ocorreu um erro interno no servidor de autenticação."
        )
        // Dica de sênior: Logue o erro real no console para você conseguir debugar
        e.printStackTrace() 
        
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error)
    }
}