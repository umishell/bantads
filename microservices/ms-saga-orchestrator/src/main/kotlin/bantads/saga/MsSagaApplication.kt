package bantads.saga

import org.springframework.amqp.rabbit.annotation.EnableRabbit
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
@EnableRabbit
class MsSagaApplication

fun main(args: Array<String>) {
    runApplication<MsSagaApplication>(*args)
}
