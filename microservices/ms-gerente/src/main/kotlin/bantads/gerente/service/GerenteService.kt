package bantads.gerente.service

import bantads.gerente.dto.AlterarGerenteRequest
import bantads.gerente.dto.DashboardGerenteItem
import bantads.gerente.dto.GerenteResponse
import bantads.gerente.dto.InserirGerenteRequest
import bantads.gerente.exception.CpfJaCadastradoException
import bantads.gerente.exception.EmailJaCadastradoException
import bantads.gerente.exception.FalhaCredencialAuthException
import bantads.gerente.exception.GerenteNaoEncontradoException
import bantads.gerente.exception.UltimoGerenteException
import bantads.gerente.integration.AuthClient
import bantads.gerente.integration.ClienteClient
import bantads.gerente.integration.ContaClient
import bantads.gerente.model.Gerente
import bantads.gerente.repository.GerenteRepository
import bantads.gerente.util.Cpf
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal

@Service
class GerenteService(
    private val repository: GerenteRepository,
    private val contaClient: ContaClient,
    private val authClient: AuthClient,
    private val clienteClient: ClienteClient,
) {

    private val log = LoggerFactory.getLogger(javaClass)

    @Transactional(readOnly = true)
    fun listar(): List<GerenteResponse> =
        repository.findAllByAtivoTrueAndTipoOrderByNomeAsc("GERENTE")
            .map { it.toResponse() }

    @Transactional(readOnly = true)
    fun obterPorCpf(cpf: String): GerenteResponse {
        val g = repository.findByCpf(Cpf.normalize(cpf))
            ?: throw GerenteNaoEncontradoException()
        return g.toResponse()
    }

    @Transactional
    fun inserir(req: InserirGerenteRequest): GerenteResponse {
        val cpf = Cpf.require(req.cpf)
        if (repository.existsByCpf(cpf)) throw CpfJaCadastradoException()
        val emailNorm = req.email.trim().lowercase()
        exigirEmailDisponivel(emailNorm)
        val g = Gerente(
            cpf = cpf,
            nome = req.nome.trim(),
            email = emailNorm,
            telefone = req.telefone.trim(),
            tipo = (req.tipo ?: "GERENTE").uppercase(),
        )
        val saved = repository.save(g)
        sincronizarCredenciaisAuth(
            emailAnterior = null,
            gerente = saved,
            senha = req.senha,
        )
        if (saved.tipo == "GERENTE") {
            val ativos = repository.findAllByAtivoTrueAndTipoOrderByNomeAsc("GERENTE")
                .mapNotNull { it.id }
            contaClient.atribuirUmaContaAoNovoGerente(saved.id!!, ativos)
        }
        log.info("Gerente inserido id={} cpf={} tipo={}", saved.id, saved.cpf, saved.tipo)
        return saved.toResponse()
    }

    @Transactional
    fun alterar(cpf: String, req: AlterarGerenteRequest): GerenteResponse {
        val g = repository.findByCpf(Cpf.normalize(cpf))
            ?: throw GerenteNaoEncontradoException()
        val emailAnterior = g.email
        req.nome?.let { g.nome = it.trim() }
        req.email?.let { novoEmail ->
            val emailNorm = novoEmail.trim().lowercase()
            if (emailNorm != g.email) {
                exigirEmailDisponivel(emailNorm, cpfExcluir = g.cpf)
            }
            g.email = emailNorm
        }
        val saved = repository.save(g)
        val senhaInformada = req.senha?.trim()?.takeIf { it.isNotEmpty() }
        if (emailAnterior != saved.email || senhaInformada != null) {
            sincronizarCredenciaisAuth(
                emailAnterior = emailAnterior,
                gerente = saved,
                senha = senhaInformada ?: throw FalhaCredencialAuthException(
                    "Informe a senha ao alterar o e-mail do gerente.",
                ),
            )
        }
        log.info("Gerente alterado id={} cpf={}", saved.id, saved.cpf)
        return saved.toResponse()
    }

    @Transactional
    fun remover(cpf: String): GerenteResponse {
        val g = repository.findByCpf(Cpf.normalize(cpf))
            ?: throw GerenteNaoEncontradoException()
        if (g.tipo == "GERENTE" && repository.countByAtivoTrueAndTipo("GERENTE") <= 1) {
            throw UltimoGerenteException()
        }
        if (g.tipo == "GERENTE") {
            val outros = repository.findAllByAtivoTrueAndTipoOrderByNomeAsc("GERENTE")
                .filter { it.id != g.id }
                .mapNotNull { it.id }
            if (outros.isNotEmpty()) {
                contaClient.remanejarContasDoGerente(g.id!!, outros)
            }
        }
        g.ativo = false
        val saved = repository.save(g)
        authClient.removerUsuario(saved.email)
        log.info("Gerente removido (soft) id={} cpf={}", saved.id, saved.cpf)
        return saved.toResponse()
    }

    @Transactional(readOnly = true)
    fun dashboard(): List<DashboardGerenteItem> {
        val gerentes = repository.findAllByAtivoTrueAndTipoOrderByNomeAsc("GERENTE")
        val agregados = contaClient.agregadosPorGerente().associateBy { it.gerenteId }
        return gerentes
            .map { g ->
                val a = agregados[g.id]
                DashboardGerenteItem(
                    gerenteId = g.id!!,
                    cpf = g.cpf,
                    nome = g.nome,
                    email = g.email,
                    totalClientes = a?.totalClientes ?: 0L,
                    somaSaldosPositivos = a?.somaSaldosPositivos ?: BigDecimal.ZERO,
                    somaSaldosNegativos = a?.somaSaldosNegativos ?: BigDecimal.ZERO,
                )
            }
            .sortedWith(
                compareByDescending<DashboardGerenteItem> { it.somaSaldosPositivos }
                    .thenBy { it.nome },
            )
    }

    private fun exigirEmailDisponivel(email: String, cpfExcluir: String? = null) {
        val ocupado = if (cpfExcluir == null) {
            repository.existsByEmailIgnoreCase(email)
        } else {
            repository.existsByEmailIgnoreCaseAndCpfNot(email, cpfExcluir)
        }
        if (ocupado || authClient.loginExiste(email) || clienteClient.emailExiste(email)) {
            throw EmailJaCadastradoException()
        }
    }

    private fun sincronizarCredenciaisAuth(emailAnterior: String?, gerente: Gerente, senha: String) {
        val emailMudou = emailAnterior != null && emailAnterior != gerente.email
        if (emailMudou) {
            authClient.removerUsuario(emailAnterior)
        }

        if (!emailMudou && emailAnterior != null && authClient.atualizarSenha(gerente.email, senha)) {
            return
        }

        val criado = authClient.criarUsuario(
            email = gerente.email,
            nome = gerente.nome,
            cpf = gerente.cpf,
            senha = senha,
            perfil = gerente.tipo,
        )
        if (!criado) {
            throw FalhaCredencialAuthException(
                "Não foi possível criar credenciais de acesso. Verifique se o e-mail já está em uso.",
            )
        }
    }

    private fun Gerente.toResponse(): GerenteResponse = GerenteResponse(
        id = id!!,
        cpf = cpf,
        nome = nome,
        email = email,
        telefone = telefone,
        tipo = tipo,
        ativo = ativo,
    )
}
