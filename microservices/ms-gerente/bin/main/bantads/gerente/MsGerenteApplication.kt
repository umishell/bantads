package bantads.gerente

import org.springframework.amqp.rabbit.annotation.EnableRabbit
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
@EnableRabbit
class MsGerenteApplication

fun main(args: Array<String>) {
    runApplication<MsGerenteApplication>(*args)
}
