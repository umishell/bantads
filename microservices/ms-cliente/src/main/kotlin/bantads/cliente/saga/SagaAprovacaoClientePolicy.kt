package bantads.cliente.saga

import bantads.cliente.model.StatusCliente
object SagaAprovacaoClientePolicy {

    const val EMAIL_STEP_MAX_ATTEMPTS: Int = 3

    val STATUS_AFTER_SAGA_FAILURE: StatusCliente = StatusCliente.PENDENTE_APROVACAO
}
