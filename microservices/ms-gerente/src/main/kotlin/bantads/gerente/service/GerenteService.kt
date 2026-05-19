package bantads.gerente.service

import bantads.gerente.dto.AlterarGerenteRequest
import bantads.gerente.dto.DashboardGerenteItem
import bantads.gerente.dto.GerenteResponse
import bantads.gerente.dto.InserirGerenteRequest
import bantads.gerente.exception.CpfJaCadastradoException
import bantads.gerente.exception.GerenteNaoEncontradoException
import bantads.gerente.exception.UltimoGerenteException
import bantads.gerente.integration.AuthClient
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
) {

    private val log = LoggerFactory.getLogger(javaClass)

    /** R19: listagem ordenada por nome ascendente (somente GERENTE ativos). */
    @Transactional(readOnly = true)
    fun listar(): List<GerenteResponse> =
        repository.findAllByAtivoTrueAndTipoOrderByNomeAsc("GERENTE")
            .map { it.toResponse() }

    /** Consulta por CPF (R13 — análogo ao consultar pessoa). */
    @Transactional(readOnly = true)
    fun obterPorCpf(cpf: String): GerenteResponse {
        val g = repository.findByCpf(Cpf.normalize(cpf))
            ?: throw GerenteNaoEncontradoException()
        return g.toResponse()
    }

    /** R17: inserção de gerente; atribui uma conta via ms-conta (regra do enunciado). */
    @Transactional
    fun inserir(req: InserirGerenteRequest): GerenteResponse {
        val cpf = Cpf.require(req.cpf)
        if (repository.existsByCpf(cpf)) throw CpfJaCadastradoException()
        val g = Gerente(
            cpf = cpf,
            nome = req.nome.trim(),
            email = req.email.trim().lowercase(),
            telefone = req.telefone.trim(),
            tipo = (req.tipo ?: "GERENTE").uppercase(),
        )
        val saved = repository.save(g)
        authClient.criarUsuario(
            email = saved.email,
            nome = saved.nome,
            cpf = saved.cpf,
            senha = req.senha,
            perfil = saved.tipo,
        )
        if (saved.tipo == "GERENTE") {
            val ativos = repository.findAllByAtivoTrueAndTipoOrderByNomeAsc("GERENTE")
                .mapNotNull { it.id }
            contaClient.atribuirUmaContaAoNovoGerente(saved.id!!, ativos)
        }
        log.info("Gerente inserido id={} cpf={} tipo={}", saved.id, saved.cpf, saved.tipo)
        return saved.toResponse()
    }

    /** R20: alteração de nome, e-mail e/ou senha. A senha é tratada no ms-auth via saga. */
    @Transactional
    fun alterar(cpf: String, req: AlterarGerenteRequest): GerenteResponse {
        val g = repository.findByCpf(Cpf.normalize(cpf))
            ?: throw GerenteNaoEncontradoException()
        req.nome?.let { g.nome = it.trim() }
        req.email?.let { g.email = it.trim().lowercase() }
        val saved = repository.save(g)
        log.info("Gerente alterado id={} cpf={}", saved.id, saved.cpf)
        return saved.toResponse()
    }

    /** R18: remoção (soft delete); remaneja contas para o gerente com menos clientes. */
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

    /**
     * R15: dashboard do administrador. Para cada gerente ativo, monta a linha com:
     * total de clientes, soma de saldos positivos e soma de saldos negativos. Ordena desc por saldos positivos.
     */
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
