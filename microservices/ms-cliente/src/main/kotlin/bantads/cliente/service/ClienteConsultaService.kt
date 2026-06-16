package bantads.cliente.service

import bantads.cliente.dto.AdminRelatorioClienteResponse
import bantads.cliente.dto.ClienteCarteiraListItemResponse
import bantads.cliente.dto.ClienteDetalheResponse
import bantads.cliente.dto.ClientePendenteListItemResponse
import bantads.cliente.integration.AuthClient
import bantads.cliente.integration.ContaUpstreamDto
import bantads.cliente.integration.GerenteUpstreamDto
import bantads.cliente.model.Cliente
import bantads.cliente.model.StatusCliente
import bantads.cliente.repository.ClienteRepository
import bantads.cliente.util.Cpf
import org.springframework.beans.factory.annotation.Value
import org.springframework.core.ParameterizedTypeReference
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.client.RestClient
import org.springframework.web.server.ResponseStatusException
import java.math.BigDecimal
import java.math.RoundingMode
import java.util.UUID

@Service
class ClienteConsultaService(
    private val repository: ClienteRepository,
    private val authClient: AuthClient,
    @Value("\${bantads.integration.conta-base-url}") private val contaBaseUrl: String,
    @Value("\${bantads.integration.gerente-base-url}") private val gerenteBaseUrl: String,
    @Value("\${bantads.consulta.aprovacao-wait-ms:120000}") private val aprovacaoWaitMs: Long,
) {

    private val listContaType = object : ParameterizedTypeReference<List<ContaUpstreamDto>>() {}
    private val listGerenteType = object : ParameterizedTypeReference<List<GerenteUpstreamDto>>() {}

    @Transactional(readOnly = true)
    fun obterPorCpf(cpfRaw: String): ClienteDetalheResponse {
        val cpf = Cpf.require(cpfRaw)
        val c = repository.findByCpf(cpf) ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Cliente não encontrado")
        if (c.status == StatusCliente.REJEITADO) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "Cliente não encontrado")
        }
        if (c.status == StatusCliente.PROCESSANDO_APROVACAO) {
            aguardarAprovacao(c.id!!)
            val atualizado = repository.findByCpf(cpf)
                ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Cliente não encontrado")
            return montarDetalhe(atualizado)
        }
        return montarDetalhe(c)
    }

    private fun aguardarAprovacao(clienteId: UUID) {
        val deadline = System.currentTimeMillis() + aprovacaoWaitMs
        while (System.currentTimeMillis() < deadline) {
            val atual = repository.findById(clienteId).orElse(null) ?: break
            when (atual.status) {
                StatusCliente.APROVADO -> {
                    if (fetchContaPorClienteId(clienteId) != null) return
                    Thread.sleep(500)
                }
                StatusCliente.REJEITADO ->
                    throw ResponseStatusException(HttpStatus.NOT_FOUND, "Cliente não encontrado")
                else -> Thread.sleep(500)
            }
        }
    }

    private fun calcularLimiteEsperado(c: Cliente): BigDecimal? {
        if (c.status !in setOf(StatusCliente.APROVADO, StatusCliente.PROCESSANDO_APROVACAO)) {
            return null
        }
        if (c.salario <= BigDecimal.ZERO) {
            return BigDecimal.ZERO.setScale(2)
        }
        return c.salario.divide(BigDecimal("2"), 2, RoundingMode.HALF_UP)
    }

    private fun montarDetalhe(c: Cliente): ClienteDetalheResponse {
        val aguardandoConta = c.status == StatusCliente.APROVADO ||
            c.status == StatusCliente.PROCESSANDO_APROVACAO
        val conta = if (aguardandoConta) fetchContaPorClienteId(c.id!!) else null
        val gerente = if (c.status == StatusCliente.APROVADO) resolverGerenteDoCliente(c) else null
        return ClienteDetalheResponse(
            id = c.id!!,
            cpf = c.cpf,
            nome = c.nome,
            email = c.email,
            telefone = c.telefone,
            salario = c.salario,
            cidade = c.cidade,
            estado = c.estado,
            endereco = c.endereco,
            cep = c.cep,
            status = c.status,
            motivoRejeicao = c.motivoRejeicao,
            decisaoGerenteEm = c.decisaoGerenteEm,
            gerenteCpf = gerente?.cpf,
            gerenteNome = gerente?.nome,
            gerenteEmail = gerente?.email,
            conta = conta?.numero,
            limite = conta?.limite ?: calcularLimiteEsperado(c),
            saldo = conta?.saldo ?: if (aguardandoConta) BigDecimal.ZERO.setScale(2) else null,
        )
    }

    private fun resolverGerenteDoCliente(cliente: Cliente): GerenteUpstreamDto? {
        if (cliente.status != StatusCliente.APROVADO) {
            return null
        }
        return try {
            val conta = fetchContaPorClienteId(cliente.id!!) ?: return null
            fetchGerentesInterno().find { it.id == conta.gerenteId }
        } catch (_: Exception) {
            null
        }
    }

    private fun fetchContaPorClienteId(clienteId: UUID): ContaUpstreamDto? {
        val url = "${contaBaseUrl.trimEnd('/')}/por-cliente/$clienteId"
        return RestClient.builder()
            .build()
            .get()
            .uri(url)
            .retrieve()
            .body(ContaUpstreamDto::class.java)
    }

    private fun fetchGerentesInterno(): List<GerenteUpstreamDto> {
        val url = "${gerenteBaseUrl.trimEnd('/')}/"
        return RestClient.builder()
            .build()
            .get()
            .uri(url)
            .retrieve()
            .body(listGerenteType)
            ?: emptyList()
    }

    @Transactional(readOnly = true)
    fun relatorioAdministrador(authorization: String): List<AdminRelatorioClienteResponse> {
        val contas = fetchContas(authorization).filter { it.ativa }
        val gerentesPorId = fetchGerentesPorId(authorization)
        val out = ArrayList<AdminRelatorioClienteResponse>()
        for (conta in contas) {
            val cliente = repository.findById(conta.clienteId).orElse(null) ?: continue
            val ger = gerentesPorId[conta.gerenteId] ?: continue
            out.add(
                AdminRelatorioClienteResponse(
                    cpfCliente = cliente.cpf,
                    nomeCliente = cliente.nome,
                    emailCliente = cliente.email,
                    salario = cliente.salario,
                    numeroConta = conta.numero,
                    saldo = conta.saldo,
                    limite = conta.limite,
                    cpfGerente = ger.cpf,
                    nomeGerente = ger.nome,
                ),
            )
        }
        return out.sortedWith(compareBy({ it.nomeCliente }, { it.cpfCliente }))
    }

    @Transactional(readOnly = true)
    fun listarCarteiraComConta(authorization: String): List<ClienteCarteiraListItemResponse> {
        val principal = authClient.introspect(authorization)
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token inválido ou expirado")
        val gerenteCpf = principal.cpf?.takeIf { principal.perfil == "GERENTE" }
        val contas = fetchContas(authorization).filter { it.ativa }
        val gerentesPorId = fetchGerentesPorId(authorization)
        return contas.mapNotNull { conta ->
            val cliente = repository.findById(conta.clienteId).orElse(null) ?: return@mapNotNull null
            if (cliente.status != StatusCliente.APROVADO) {
                return@mapNotNull null
            }
            val ger = gerentesPorId[conta.gerenteId] ?: return@mapNotNull null
            if (gerenteCpf != null && ger.cpf != gerenteCpf) {
                return@mapNotNull null
            }
            toCarteiraItem(cliente, conta, ger)
        }.sortedWith(compareBy({ it.nome }, { it.cpf }))
    }

    @Transactional(readOnly = true)
    fun melhoresClientesPorSaldo(authorization: String): List<ClienteCarteiraListItemResponse> {
        val top = fetchContasTop3(authorization)
        val gerentesPorId = fetchGerentesPorId(authorization)
        return top.mapNotNull { conta ->
            val cliente = repository.findById(conta.clienteId).orElse(null) ?: return@mapNotNull null
            val ger = gerentesPorId[conta.gerenteId] ?: return@mapNotNull null
            toCarteiraItem(cliente, conta, ger)
        }
    }

    @Transactional(readOnly = true)
    fun listarPorFiltroQuery(filtro: String?, authorization: String): Any {
        val f = filtro?.trim()?.lowercase().orEmpty()
        return when (f) {
            "para_aprovar" -> listarPendentesMesmoContrato()
            "melhores_clientes" -> melhoresClientesPorSaldo(authorization)
            "adm_relatorio_clientes" -> relatorioAdministrador(authorization)
            "" -> listarCarteiraComConta(authorization)
            else -> throw ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "filtro inválido; use para_aprovar, melhores_clientes, adm_relatorio_clientes ou omita para a carteira",
            )
        }
    }

    private fun listarPendentesMesmoContrato(): List<ClientePendenteListItemResponse> =
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

    private fun toCarteiraItem(
        cliente: Cliente,
        conta: ContaUpstreamDto,
        ger: GerenteUpstreamDto,
    ): ClienteCarteiraListItemResponse =
        ClienteCarteiraListItemResponse(
            cpf = cliente.cpf,
            nome = cliente.nome,
            email = cliente.email,
            telefone = cliente.telefone,
            cidade = cliente.cidade,
            estado = cliente.estado,
            endereco = cliente.endereco,
            salario = cliente.salario,
            conta = conta.numero,
            agencia = AGENCIA_PADRAO,
            saldo = conta.saldo,
            limite = conta.limite,
            situacao = cliente.status.name,
            gerenteCpf = ger.cpf,
            gerenteNome = ger.nome,
            gerenteEmail = ger.email,
            cep = cliente.cep,
        )

    private fun fetchContas(authorization: String): List<ContaUpstreamDto> =
        upstreamGet(contaBaseUrl, "", authorization, listContaType)

    private fun fetchContasTop3(authorization: String): List<ContaUpstreamDto> =
        upstreamGet(contaBaseUrl, "top3", authorization, listContaType)

    private fun fetchGerentesPorId(authorization: String): Map<UUID, GerenteUpstreamDto> {
        val list = upstreamGet(gerenteBaseUrl, "", authorization, listGerenteType)
        return list.associateBy { it.id }
    }

    private fun <T : Any> upstreamGet(
        baseUrl: String,
        pathSuffix: String,
        authorization: String,
        type: ParameterizedTypeReference<T>,
    ): T {
        val root = baseUrl.trimEnd('/')

        val target =
            if (pathSuffix.isBlank()) "$root/" else "$root/${pathSuffix.trimStart('/')}"
        try {
            return RestClient.builder()
                .baseUrl(target)
                .defaultHeader(HttpHeaders.AUTHORIZATION, authorization)
                .build()
                .get()
                .retrieve()
                .body(type)
                ?: throw ResponseStatusException(HttpStatus.BAD_GATEWAY, "Resposta vazia do serviço upstream")
        } catch (ex: org.springframework.web.client.RestClientResponseException) {
            if (ex.statusCode == HttpStatus.UNAUTHORIZED) {
                throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Upstream não autorizou o token", ex)
            }
            throw ResponseStatusException(
                HttpStatus.BAD_GATEWAY,
                "Falha ao consultar upstream (${ex.statusCode}): ${ex.message}",
                ex,
            )
        } catch (ex: Exception) {
            throw ResponseStatusException(HttpStatus.BAD_GATEWAY, "Falha de rede ao consultar upstream: ${ex.message}", ex)
        }
    }

    companion object {
        private const val AGENCIA_PADRAO = "0001"
    }
}
