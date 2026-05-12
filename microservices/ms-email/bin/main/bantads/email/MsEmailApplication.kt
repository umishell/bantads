package bantads.email

import org.springframework.amqp.rabbit.annotation.EnableRabbit
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
@EnableRabbit
class MsEmailApplication

fun main(args: Array<String>) {
    runApplication<MsEmailApplication>(*args)
}
