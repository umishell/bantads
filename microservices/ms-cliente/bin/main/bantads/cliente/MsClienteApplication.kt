package bantads.cliente

import org.springframework.amqp.rabbit.annotation.EnableRabbit
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
@EnableRabbit
class MsClienteApplication

fun main(args: Array<String>) {
    runApplication<MsClienteApplication>(*args)
}
