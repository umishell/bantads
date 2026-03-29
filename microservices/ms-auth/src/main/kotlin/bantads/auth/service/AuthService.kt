package bantads.auth.service

import bantads.auth.dto.LoginRequest
import bantads.auth.dto.LoginResponse
import bantads.auth.dto.LogoutResponse
import bantads.auth.dto.UserDTO
import bantads.auth.dto.UsuarioLoginResponse
import bantads.auth.model.User
import bantads.auth.repository.UserRepository
import bantads.auth.security.JwtService
import bantads.auth.security.Sha256SaltPasswordHasher
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.security.authentication.BadCredentialsException
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException

@Service
class AuthService(
    private val userRepository: UserRepository,
    private val passwordHasher: Sha256SaltPasswordHasher,
    private val jwtService: JwtService,
) {

    private val logger = LoggerFactory.getLogger(javaClass)

    private val senhaChars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"

    fun gerarSenhaAleatoria(tamanho: Int = 12): String =
        (1..tamanho).map { senhaChars.random() }.joinToString("")

    /**
     * Cria usuário CLIENTE para a saga; idempotente por [sagaId] armazenado em mensagem —
     * aqui usamos login único: se já existir, retorna falha para a saga compensar conta.
     */
    fun criarClienteParaSaga(email: String, nome: String, cpf: String): ResultadoCriacaoSaga {
        val login = email.trim().lowercase()
        if (userRepository.existsByLogin(login)) {
            logger.warn("Login já existente na saga: {}", login)
            return ResultadoCriacaoSaga(criado = false, plainPassword = null, login = login)
        }
        val senha = gerarSenhaAleatoria()
        val hashed = passwordHasher.hash(senha)
        val novoUsuario = User(
            login = login,
            senhaHash = hashed.hashHex,
            salt = hashed.saltHex,
            nome = nome,
            cpf = cpf.filter { it.isDigit() },
            perfil = "CLIENTE",
        )
        userRepository.save(novoUsuario)
        logger.info("Usuário CLIENTE criado via saga login={}", login)
        return ResultadoCriacaoSaga(criado = true, plainPassword = senha, login = login)
    }

    fun removerUsuarioPorLogin(login: String) {
        val n = userRepository.deleteByLogin(login.trim().lowercase())
        logger.info("Remoção por login {} registros={}", login, n)
    }

    /**
     * Idempotente para a SAGA legada: reprocessamento não quebra se o login já existir.
     */
    fun cadastrarNovoUsuario(userDto: UserDTO) {
        logger.info("Iniciando processo de cadastro para o login: ${userDto.email}")

        if (userRepository.existsByLogin(userDto.email)) {
            logger.warn("Cadastro duplicado ignorado: ${userDto.email} já existe.")
            return
        }

        val hashed = passwordHasher.hash(userDto.senha)
        val novoUsuario = User(
            login = userDto.email,
            senhaHash = hashed.hashHex,
            salt = hashed.saltHex,
            nome = userDto.nome,
            cpf = userDto.cpf.orEmpty(),
            perfil = "CLIENTE",
        )

        userRepository.save(novoUsuario)
        logger.info("Usuário ${userDto.email} cadastrado com perfil CLIENTE.")
    }

    fun autenticar(request: LoginRequest): LoginResponse {
        logger.info("Tentativa de login para: ${request.login}")

        val user = userRepository.findByLogin(request.login)
            ?: run {
                logger.warn("Login falhou: usuário não encontrado (${request.login}).")
                throw BadCredentialsException("Usuário ou senha inválidos")
            }

        if (!passwordHasher.matches(request.senha, user.salt, user.senhaHash)) {
            logger.warn("Login falhou: senha incorreta (${request.login}).")
            throw BadCredentialsException("Usuário ou senha inválidos")
        }

        logger.info("Login OK: ${request.login}")

        val token = jwtService.gerarToken(user.login, user.perfil)
        val usuario = UsuarioLoginResponse(
            cpf = user.cpf,
            nome = user.nome,
            email = user.login,
            tipo = user.perfil,
        )

        return LoginResponse(
            accessToken = token,
            tipo = user.perfil,
            usuario = usuario,
        )
    }

    fun logout(token: String): LogoutResponse {
        if (!jwtService.isTokenValido(token)) {
            throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token inválido ou expirado")
        }

        val claims = try {
            jwtService.getClaims(token)
        } catch (e: Exception) {
            throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token inválido")
        }

        val login = claims.subject
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token sem assunto")

        val user = userRepository.findByLogin(login)
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário não encontrado")

        logger.info("Logout processado para: $login")

        return LogoutResponse(
            cpf = user.cpf,
            nome = user.nome,
            email = user.login,
            tipo = user.perfil,
        )
    }
}

data class ResultadoCriacaoSaga(
    val criado: Boolean,
    val plainPassword: String?,
    val login: String,
)
