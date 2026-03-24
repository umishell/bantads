package br.ufpr.bantads.ms_auth.service

import br.ufpr.bantads.ms_auth.dto.LoginRequest
import br.ufpr.bantads.ms_auth.dto.LoginResponse
import br.ufpr.bantads.ms_auth.dto.LogoutResponse
import br.ufpr.bantads.ms_auth.dto.UserDTO
import br.ufpr.bantads.ms_auth.model.User
import br.ufpr.bantads.ms_auth.repository.UserRepository
import br.ufpr.bantads.ms_auth.security.JwtService
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.stereotype.Service

@Service
class AuthService(
    private val userRepository: UserRepository,
    private val passwordEncoder: BCryptPasswordEncoder,
    private val jwtService: JwtService
) {

    /**
     * Implementação Idempotente para a SAGA.
     * Se a mensagem for reprocessada, o sistema não quebra.
     */
    fun cadastrarNovoUsuario(userDto: UserDTO) {
        logger.info("Iniciando processo de cadastro para o login: ${userDto.email}")

        // 1. CHECAGEM DE IDEMPOTÊNCIA (O "Pulo do Gato")
        // Se o usuário JÁ EXISTE, apenas retornamos. 
        // Para a SAGA, isso conta como "Sucesso", pois o objetivo (usuário no banco) já foi atingido.
        if (userRepository.existsByLogin(userDto.email)) {
            logger.warn("Tentativa de cadastro duplicado: o login ${userDto.email} já existe. Ignorando.")
            return 
        }

        // 2. CRIAÇÃO (Só acontece se o login for inédito)
        val senhaCriptografada = passwordEncoder.encode(userDto.senha)
        
        val novoUsuario = User(
            login = userDto.email,
            senha = senhaCriptografada,
            nome = userDto.nome,
            perfil = "CLIENTE"
        )
        
        userRepository.save(novoUsuario)
        logger.info("Usuário ${userDto.email} cadastrado com sucesso com perfil CLIENTE.")
    }

    fun autenticar(request: LoginRequest): LoginResponse {
        logger.info("Tentativa de login para o usuário: ${request.login}")

        val user = userRepository.findByLogin(request.login) 
            ?:run {
                logger.error("Falha no login: usuário ${request.login} não encontrado.")
                throw Exception("Usuário ou senha inválidos")
            }

        if (!passwordEncoder.matches(request.senha, user.senha)) {
            logger.error("Falha no login: senha incorreta para o usuário ${request.login}.")
            throw Exception("Usuário ou senha inválidos")
        }

        logger.info("Login bem-sucedido para o usuário: ${request.login}")

        return LoginResponse(
            token = jwtService.gerarToken(user.login, user.perfil),
            nome = user.nome,
            perfil = user.perfil
        )
    }

    fun logout(): LogoutResponse {
        logger.info("Executando operação de logout.")
        return LogoutResponse()
    }
}