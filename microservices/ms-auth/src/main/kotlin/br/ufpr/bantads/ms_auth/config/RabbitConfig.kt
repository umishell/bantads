package br.ufpr.bantads.ms_auth.config

import org.springframework.amqp.core.*
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
class RabbitConfig {

    // Define que as mensagens serão JSON (essencial para Kotlin/Java entenderem o objeto)
    @Bean
    fun messageConverter(): Jackson2JsonMessageConverter {
        return Jackson2JsonMessageConverter()
    }

    // Declara a fila que este microsserviço vai ouvir
    @Bean
    fun authQueue(): Queue {
        return Queue("auth-create-user-queue", true) // true = durável (não some se o Rabbit reiniciar)
    }

    // Declara a Exchange de resposta (onde o Auth publica o resultado)
    @Bean
    fun responseExchange(): TopicExchange {
        return TopicExchange("saga-response-exchange")
    }
}