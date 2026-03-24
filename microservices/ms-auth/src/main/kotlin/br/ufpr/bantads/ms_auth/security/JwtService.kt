package br.ufpr.bantads.ms_auth.security

import io.jsonwebtoken.Claims
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.SignatureAlgorithm
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.util.*

@Service
class JwtService {

    // Sênior: Nunca deixe segredos hardcoded. Use o application.properties
    @Value("\${jwt.secret}")
    private lateinit var secret: String

    @Value("\${jwt.expiration}")
    private var expiration: Long = 3600000 // Default 1 hora

    /**
     * Gera o token com as informações do usuário
     */
    fun gerarToken(login: String, perfil: String): String {
        return Jwts.builder()
            .setSubject(login)
            .claim("perfil", perfil) // Informação vital para o Gateway e outros MS
            .setIssuedAt(Date())
            .setExpiration(Date(System.currentTimeMillis() + expiration))
            .signWith(SignatureAlgorithm.HS512, secret.toByteArray()) // Importante: converter para ByteArray
            .compact()
    }

    /**
     * Extrai todas as informações (Claims) do token
     */
    fun getClaims(token: String): Claims {
        return Jwts.parser()
            .setSigningKey(secret.toByteArray())
            .parseClaimsJws(token)
            .body
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