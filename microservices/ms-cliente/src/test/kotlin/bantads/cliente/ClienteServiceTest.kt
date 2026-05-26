package bantads.cliente

import bantads.cliente.dto.AutocadastroRequest
import bantads.cliente.exception.CpfJaCadastradoException
import bantads.cliente.integration.AuthClient
import bantads.cliente.integration.ContaOperacoesClient
import bantads.cliente.integration.GerenteClient
import bantads.cliente.messaging.ClienteSagaPublisher
import bantads.cliente.model.Cliente
import bantads.cliente.repository.ClienteRepository
import bantads.cliente.service.ClienteService
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever
import org.mockito.Mockito.verify as mockitoVerify
import java.math.BigDecimal
import java.util.UUID

class ClienteServiceTest {

    private val repository: ClienteRepository = mock()
    private val sagaPublisher: ClienteSagaPublisher = mock()
    private val contaOperacoesClient: ContaOperacoesClient = mock()
    private val authClient: AuthClient = mock()
    private val gerenteClient: GerenteClient = mock()
    private val service = ClienteService(repository, sagaPublisher, contaOperacoesClient, authClient, gerenteClient)

    private val req = AutocadastroRequest(
        cpf = "52998224725",
        email = "a@b.com",
        nome = "Fulano",
        telefone = "41999990000",
        salario = BigDecimal("5000.00"),
        endereco = "Rua X 1",
        cep = "80010000",
        cidade = "Curitiba",
        estado = "PR",
    )

    @Test
    fun `autocadastro persiste e publica evento quando CPF novo`() {
        whenever(repository.existsByCpf("52998224725")).thenReturn(false)
        whenever(repository.existsByEmailIgnoreCase("a@b.com")).thenReturn(false)
        whenever(authClient.loginExiste("a@b.com")).thenReturn(false)
        whenever(gerenteClient.emailExiste("a@b.com")).thenReturn(false)
        whenever(repository.save(any())).thenAnswer { inv ->
            val c = inv.getArgument<Cliente>(0)
            c.apply { id = UUID.fromString("00000000-0000-0000-0000-000000000001") }
        }

        val res = service.autocadastro(req)

        assertEquals("52998224725", res.cpf)
        assertTrue(res.avisos.isNotEmpty())
        mockitoVerify(sagaPublisher).publicarClientePendenteCriado(any())
    }

    @Test
    fun `autocadastro lança conflito quando CPF já existe`() {
        whenever(repository.existsByCpf("52998224725")).thenReturn(true)

        assertThrows(CpfJaCadastradoException::class.java) {
            service.autocadastro(req)
        }
    }
}
