package bantads.auth.service

import bantads.auth.dto.LoginRequest
import bantads.auth.dto.LoginResponse
import bantads.auth.dto.LogoutResponse
import bantads.auth.dto.UsuarioLoginResponse
import bantads.auth.model.User
import bantads.auth.repository.UserRepository
import bantads.auth.security.JwtService
import bantads.auth.security.Sha256SaltPasswordHasher
import bantads.auth.security.TokenBlacklist
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
    private val tokenBlacklist: TokenBlacklist,
) {

    private val logger = LoggerFactory.getLogger(javaClass)

    private val senhaChars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"

    fun gerarSenhaAleatoria(tamanho: Int = 12): String =
        (1..tamanho).map { senhaChars.random() }.joinToString("")

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

    fun findUserByLogin(login: String): User? =
        userRepository.findByLogin(login.trim().lowercase())

    fun removerUsuarioPorLogin(login: String) {
        val n = userRepository.deleteByLogin(login.trim().lowercase())
        logger.info("Remoção por login {} registros={}", login, n)
    }

    fun criarUsuarioBackoffice(
        email: String,
        nome: String,
        cpf: String,
        senha: String,
        perfil: String,
    ): Boolean {
        val login = email.trim().lowercase()
        if (userRepository.existsByLogin(login)) {
            logger.warn("Login já existente: {}", login)
            return false
        }
        val hashed = passwordHasher.hash(senha)
        val novoUsuario = User(
            login = login,
            senhaHash = hashed.hashHex,
            salt = hashed.saltHex,
            nome = nome.trim(),
            cpf = cpf.filter { it.isDigit() },
            perfil = perfil.trim().uppercase(),
        )
        userRepository.save(novoUsuario)
        logger.info("Usuário {} criado login={}", novoUsuario.perfil, login)
        return true
    }

    fun atualizarSenhaPorLogin(email: String, senhaNova: String): Boolean {
        val login = email.trim().lowercase()
        val user = userRepository.findByLogin(login) ?: run {
            logger.warn("Atualização de senha: login não encontrado ({})", login)
            return false
        }
        val hashed = passwordHasher.hash(senhaNova)
        userRepository.save(
            user.copy(
                senhaHash = hashed.hashHex,
                salt = hashed.saltHex,
            ),
        )
        logger.info("Senha atualizada login={}", login)
        return true
    }

    fun autenticar(request: LoginRequest): LoginResponse {
        val login = request.login.trim().lowercase()
        logger.info("Tentativa de login para: {}", login)

        val user = userRepository.findByLogin(login)
            ?: run {
                logger.warn("Login falhou: usuário não encontrado ({}).", login)
                throw BadCredentialsException("Usuário ou senha inválidos")
            }

        if (!passwordHasher.matches(request.senha, user.salt, user.senhaHash)) {
            logger.warn("Login falhou: senha incorreta ({}).", login)
            throw BadCredentialsException("Usuário ou senha inválidos")
        }

        logger.info("Login OK: {}", login)

        val token = jwtService.gerarToken(user.login, user.perfil, user.cpf)
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

        val expiraEm = claims.expiration?.toInstant()
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token sem expiração")
        tokenBlacklist.revogar(token, expiraEm)
        logger.info("Logout processado para: $login (token revogado)")

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
