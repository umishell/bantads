package bantads.auth

import bantads.auth.dto.LoginRequest
import bantads.auth.model.User
import bantads.auth.repository.UserRepository
import bantads.auth.security.JwtService
import bantads.auth.security.Sha256SaltPasswordHasher
import bantads.auth.security.TokenBlacklist
import bantads.auth.service.AuthService
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.ArgumentMatchers.anyString
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.Mockito.`when`
import org.springframework.security.authentication.BadCredentialsException

@ExtendWith(MockitoExtension::class)
class AuthServiceTest {

    @Mock
    private lateinit var userRepository: UserRepository

    @Mock
    private lateinit var passwordHasher: Sha256SaltPasswordHasher

    @Mock
    private lateinit var jwtService: JwtService

    @Mock
    private lateinit var tokenBlacklist: TokenBlacklist

    private lateinit var authService: AuthService

    @BeforeEach
    fun setup() {
        authService = AuthService(userRepository, passwordHasher, jwtService, tokenBlacklist)
    }

    @Test
    fun `autenticar retorna access_token e usuario`() {
        val user = User(
            login = "cli1@bantads.com.br",
            senhaHash = "hash",
            salt = "salt",
            nome = "Catharyna",
            cpf = "12912861012",
            perfil = "CLIENTE",
        )
        `when`(userRepository.findByLogin("cli1@bantads.com.br")).thenReturn(user)
        `when`(passwordHasher.matches("tads", "salt", "hash")).thenReturn(true)
        `when`(jwtService.gerarToken("cli1@bantads.com.br", "CLIENTE")).thenReturn("jwt-xyz")

        val res = authService.autenticar(LoginRequest(login = "cli1@bantads.com.br", senha = "tads"))

        assertEquals("jwt-xyz", res.accessToken)
        assertEquals("Bearer", res.tokenType)
        assertEquals("CLIENTE", res.tipo)
        assertEquals("12912861012", res.usuario.cpf)
        assertEquals("cli1@bantads.com.br", res.usuario.email)
    }

    @Test
    fun `autenticar usuario inexistente lanca BadCredentialsException`() {
        `when`(userRepository.findByLogin(anyString())).thenReturn(null)

        assertThrows(BadCredentialsException::class.java) {
            authService.autenticar(LoginRequest(login = "x@y.com", senha = "tads"))
        }
    }
}
