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
class JwtService {

    // Sênior: Nunca deixe segredos hardcoded. Use o application.properties
    @Value("\${jwt.secret}")
    private lateinit var secret: String

    @Value("\${jwt.expiration}")
    private var expiration: Long = 3600000 // Default 1 hora

    /** HS512 exige chave ≥ 512 bits; derivamos com SHA-512 a partir do segredo configurado. */
    private fun signingKey(): SecretKey {
        val digest = MessageDigest.getInstance("SHA-512").digest(secret.toByteArray(StandardCharsets.UTF_8))
        return Keys.hmacShaKeyFor(digest)
    }

    /**
     * Gera o token com as informações do usuário
     */
    fun gerarToken(login: String, perfil: String): String {
        val now = System.currentTimeMillis()
        return Jwts.builder()
            .subject(login)
            .claim("perfil", perfil)
            .claim("tipo", perfil)
            .issuedAt(Date(now))
            .expiration(Date(now + expiration))
            .signWith(signingKey())
            .compact()
    }

    /**
     * Extrai todas as informações (Claims) do token
     */
    fun getClaims(token: String): Claims {
        return Jwts.parser()
            .verifyWith(signingKey())
            .build()
            .parseSignedClaims(token)
            .payload
    }

    /**
     * Valida se o token ainda é válido (não expirou)
     */
    fun isTokenValido(token: String): Boolean {
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