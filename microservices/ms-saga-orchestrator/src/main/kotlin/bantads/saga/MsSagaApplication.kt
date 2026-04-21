package bantads.saga

import org.springframework.amqp.rabbit.annotation.EnableRabbit
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableScheduling

@SpringBootApplication
@EnableRabbit
@EnableScheduling
class MsSagaApplication

fun main(args: Array<String>) {
    runApplication<MsSagaApplication>(*args)
}
