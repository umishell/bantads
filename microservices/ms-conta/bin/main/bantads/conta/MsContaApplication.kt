package bantads.conta

import org.springframework.amqp.rabbit.annotation.EnableRabbit
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
@EnableRabbit
class MsContaApplication

fun main(args: Array<String>) {
    runApplication<MsContaApplication>(*args)
}
