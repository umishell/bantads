package bantads.auth.security

import io.jsonwebtoken.Claims
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import java.util.Date
import javax.crypto.SecretKey

@Service
class JwtService(
    private val tokenBlacklist: TokenBlacklist,
) {

    @Value("\${jwt.secret}")
    private lateinit var secret: String

    @Value("\${jwt.expiration}")
    private var expiration: Long = 3600000 

    private fun signingKey(): SecretKey {
        val digest = MessageDigest.getInstance("SHA-512").digest(secret.toByteArray(StandardCharsets.UTF_8))
        return Keys.hmacShaKeyFor(digest)
    }

    fun gerarToken(login: String, perfil: String, cpf: String? = null): String {
        val now = System.currentTimeMillis()
        val builder = Jwts.builder()
            .subject(login)
            .claim("perfil", perfil)
            .claim("tipo", perfil)
        cpf?.filter { it.isDigit() }?.takeIf { it.length == 11 }?.let { builder.claim("cpf", it) }
        return builder
            .issuedAt(Date(now))
            .expiration(Date(now + expiration))
            .signWith(signingKey())
            .compact()
    }

    fun getClaims(token: String): Claims {
        return Jwts.parser()
            .verifyWith(signingKey())
            .build()
            .parseSignedClaims(token)
            .payload
    }

    fun isTokenValido(token: String): Boolean {
        if (tokenBlacklist.isRevogado(token)) return false
        return try {
            val claims = getClaims(token)
            val dataExpiracao = claims.expiration
            val agora = Date()
            dataExpiracao.after(agora)
        } catch (e: Exception) {
            false
        }
    }
}
