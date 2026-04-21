package bantads.cliente.service

import bantads.cliente.dto.AprovarClienteRequest
import bantads.cliente.dto.AutocadastroRequest
import bantads.cliente.dto.AutocadastroResponse
import bantads.cliente.dto.ClientePendenteListItemResponse
import bantads.cliente.dto.RejeitarClienteRequest
import bantads.cliente.exception.CpfJaCadastradoException
import bantads.cliente.exception.EstadoClienteInvalidoException
import bantads.cliente.messaging.ClienteSagaPublisher
import bantads.cliente.model.Cliente
import bantads.cliente.model.StatusCliente
import bantads.cliente.repository.ClienteRepository
import bantads.cliente.util.Cpf
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

@Service
class ClienteService(
    private val repository: ClienteRepository,
    private val sagaPublisher: ClienteSagaPublisher,
) {

    @Transactional
    fun autocadastro(req: AutocadastroRequest): AutocadastroResponse {
        val cpf = Cpf.require(req.cpf)
        val cepDigits = req.cep.filter { it.isDigit() }
        require(cepDigits.length == 8) { "CEP deve conter 8 dígitos" }
        if (repository.existsByCpf(cpf)) {
            throw CpfJaCadastradoException()
        }

        val correlationId = UUID.randomUUID().toString()
        val sagaId = UUID.randomUUID().toString()

        val cliente = Cliente(
            cpf = cpf,
            email = req.email.trim().lowercase(),
            nome = req.nome.trim(),
            telefone = req.telefone.trim(),
            salario = req.salario,
            endereco = req.endereco.trim(),
            cep = cepDigits,
            cidade = req.cidade.trim(),
            estado = req.estado.uppercase(),
            status = StatusCliente.PENDENTE_APROVACAO,
        )
        val saved = repository.save(cliente)
        val id = saved.id!!

        sagaPublisher.publicarClientePendenteCriado(
            mapOf(
                "correlationId" to correlationId,
                "sagaId" to sagaId,
                "clienteId" to id.toString(),
                "cpf" to cpf,
                "email" to saved.email,
                "nome" to saved.nome,
                "salario" to saved.salario.toPlainString(),
                "telefone" to saved.telefone,
                "endereco" to saved.endereco,
                "cep" to saved.cep,
                "cidade" to saved.cidade,
                "estado" to saved.estado,
            ),
        )

        return AutocadastroResponse(
            message = "Solicitação de cadastro recebida com sucesso.",
            avisos = listOf(
                "Aguarde a análise e aprovação de um gerente.",
                "A senha de acesso será enviada por e-mail somente após a aprovação.",
            ),
            clienteId = id,
            cpf = cpf,
        )
    }

    @Transactional(readOnly = true)
    fun listarPendentes(): List<ClientePendenteListItemResponse> =
        repository.findAllByStatusOrderByCriadoEmAsc(StatusCliente.PENDENTE_APROVACAO).map { c ->
            ClientePendenteListItemResponse(
                id = c.id!!,
                cpf = c.cpf,
                nome = c.nome,
                email = c.email,
                telefone = c.telefone,
                salario = c.salario,
                cidade = c.cidade,
                estado = c.estado,
                criadoEm = c.criadoEm,
            )
        }

    @Transactional
    fun aprovar(clienteId: UUID, @Suppress("UNUSED_PARAMETER") body: AprovarClienteRequest) {
        val c = repository.findById(clienteId).orElseThrow {
            EstadoClienteInvalidoException("Cliente não encontrado")
        }
        when (c.status) {
            StatusCliente.PENDENTE_APROVACAO -> {
                c.status = StatusCliente.PROCESSANDO_APROVACAO
                c.decisaoGerenteEm = Instant.now()
                repository.save(c)
            }
            StatusCliente.PROCESSANDO_APROVACAO ->
                throw EstadoClienteInvalidoException("Cliente já está em processamento de aprovação")
            StatusCliente.APROVADO ->
                throw EstadoClienteInvalidoException("Cliente já aprovado")
            StatusCliente.REJEITADO ->
                throw EstadoClienteInvalidoException("Cliente rejeitado; não é possível aprovar")
        }

        val sagaId = UUID.randomUUID().toString()
        val correlationId = UUID.randomUUID().toString()
        sagaPublisher.publicarAprovacaoIniciada(
            mapOf(
                "correlationId" to correlationId,
                "sagaId" to sagaId,
                "clienteId" to c.id!!.toString(),
                "cpf" to c.cpf,
                "email" to c.email,
                "nome" to c.nome,
                "salario" to c.salario.toPlainString(),
                "telefone" to c.telefone,
                "endereco" to c.endereco,
                "cep" to c.cep,
                "cidade" to c.cidade,
                "estado" to c.estado,
            ),
        )
    }

    @Transactional
    fun rejeitar(clienteId: UUID, body: RejeitarClienteRequest) {
        val c = repository.findById(clienteId).orElseThrow {
            EstadoClienteInvalidoException("Cliente não encontrado")
        }
        if (c.status != StatusCliente.PENDENTE_APROVACAO) {
            throw EstadoClienteInvalidoException("Somente clientes pendentes podem ser rejeitados")
        }
        c.status = StatusCliente.REJEITADO
        c.motivoRejeicao = body.motivo.trim()
        c.decisaoGerenteEm = Instant.now()
        repository.save(c)

        val sagaId = UUID.randomUUID().toString()
        val correlationId = UUID.randomUUID().toString()
        sagaPublisher.publicarClienteRejeitado(
            mapOf(
                "correlationId" to correlationId,
                "sagaId" to sagaId,
                "email" to c.email,
                "nome" to c.nome,
                "motivo" to body.motivo.trim(),
            ),
        )
    }
}
