package bantads.saga.listener

import bantads.saga.engine.SagaOrchestrator
import org.springframework.amqp.rabbit.annotation.RabbitListener
import org.springframework.stereotype.Component

@Component
class SagaRabbitListeners(
    private val orchestrator: SagaOrchestrator,
) {

    @RabbitListener(queues = ["saga.cliente.events"], containerFactory = "rawJsonListenerContainerFactory")
    fun onClienteEvent(body: String) {
        orchestrator.onClienteEventJson(body)
    }

    @RabbitListener(queues = ["saga.inbound.responses"], containerFactory = "rawJsonListenerContainerFactory")
    fun onServiceResponse(body: String) {
        orchestrator.onServiceResponseJson(body)
    }
}
