package bantads.auth

import org.springframework.amqp.rabbit.annotation.EnableRabbit
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
@EnableRabbit
class MsAuthApplication

fun main(args: Array<String>) {
	runApplication<MsAuthApplication>(*args)
}
