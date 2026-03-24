package br.ufpr.bantads.ms_auth.messaging

import br.ufpr.bantads.ms_auth.dto.UserDTO
import br.ufpr.bantads.ms_auth.service.AuthService
import org.springframework.amqp.rabbit.annotation.RabbitListener
import org.springframework.amqp.rabbit.core.RabbitTemplate
import org.springframework.stereotype.Component

@Component
class AuthConsumer(
    private val authService: AuthService,
    private val rabbitTemplate: RabbitTemplate // Injetamos o template para responder
) {

    @RabbitListener(queues = ["auth-create-user-queue"])
    fun receberCriacaoUsuario(userDto: UserDTO) {
        try {
            // 1. Tenta a operação de negócio
            authService.cadastrarNovoUsuario(userDto)

            // 2. Notifica o Orquestrador de SUCESSO
            // Enviamos uma mensagem para a fila de resposta da SAGA
            rabbitTemplate.convertAndSend("saga-response-exchange", "auth.success", "Usuário criado com sucesso")
            
        } catch (e: Exception) {
            // 3. Notifica o Orquestrador de ERRO (Gera a Compensação)
            rabbitTemplate.convertAndSend("saga-response-exchange", "auth.fail", e.message ?: "Erro desconhecido")
        }
    }
}