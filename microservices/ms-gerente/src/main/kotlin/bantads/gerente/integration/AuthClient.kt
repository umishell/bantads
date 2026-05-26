package bantads.gerente.integration

import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.net.URI
import java.net.URLEncoder
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.nio.charset.StandardCharsets
import java.time.Duration

@Component
class AuthClient(
    @Value("\${bantads.auth-service.base-url}") private val baseUrl: String,
    private val objectMapper: ObjectMapper,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    private val httpClient: HttpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(3))
        .build()

    fun loginExiste(email: String): Boolean {
        val login = email.trim().lowercase()
        val encoded = URLEncoder.encode(login, StandardCharsets.UTF_8)
        val req = HttpRequest.newBuilder()
            .uri(URI.create("$baseUrl/internal/usuarios/existe?login=$encoded"))
            .timeout(Duration.ofSeconds(5))
            .header("Accept", "application/json")
            .GET()
            .build()
        return try {
            val resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString())
            if (resp.statusCode() != 200) {
                log.warn("ms-auth GET usuarios/existe status={} body={}", resp.statusCode(), resp.body())
                return false
            }
            objectMapper.readTree(resp.body()).path("existe").asBoolean(false)
        } catch (ex: Exception) {
            log.warn("ms-auth indisponível ao verificar login: {}", ex.message)
            false
        }
    }

    fun criarUsuario(email: String, nome: String, cpf: String, senha: String, perfil: String): Boolean {
        val body = mapOf(
            "email" to email,
            "nome" to nome,
            "cpf" to cpf,
            "senha" to senha,
            "perfil" to perfil,
        )
        val json = objectMapper.writeValueAsString(body)
        val req = HttpRequest.newBuilder()
            .uri(URI.create("$baseUrl/internal/usuarios"))
            .timeout(Duration.ofSeconds(10))
            .header("Content-Type", "application/json")
            .header("Accept", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(json))
            .build()
        return try {
            val resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString())
            when (resp.statusCode()) {
                201 -> true
                409 -> {
                    log.warn("ms-auth: login já existe email={}", email)
                    false
                }
                else -> {
                    log.warn("ms-auth POST usuarios status={} body={}", resp.statusCode(), resp.body())
                    false
                }
            }
        } catch (ex: Exception) {
            log.warn("ms-auth indisponível ao criar usuário: {}", ex.message)
            false
        }
    }

    fun removerUsuario(email: String) {
        val body = mapOf("email" to email)
        val json = objectMapper.writeValueAsString(body)
        val req = HttpRequest.newBuilder()
            .uri(URI.create("$baseUrl/internal/usuarios"))
            .timeout(Duration.ofSeconds(10))
            .header("Content-Type", "application/json")
            .method("DELETE", HttpRequest.BodyPublishers.ofString(json))
            .build()
        try {
            val resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString())
            if (resp.statusCode() !in 200..299) {
                log.warn("ms-auth DELETE usuarios status={} body={}", resp.statusCode(), resp.body())
            }
        } catch (ex: Exception) {
            log.warn("ms-auth indisponível ao remover usuário: {}", ex.message)
        }
    }

    /** R20 — propaga nova senha ao ms-auth. */
    fun atualizarSenha(email: String, senha: String): Boolean {
        val body = mapOf("email" to email, "senha" to senha)
        val json = objectMapper.writeValueAsString(body)
        val req = HttpRequest.newBuilder()
            .uri(URI.create("$baseUrl/internal/usuarios/senha"))
            .timeout(Duration.ofSeconds(10))
            .header("Content-Type", "application/json")
            .method("PATCH", HttpRequest.BodyPublishers.ofString(json))
            .build()
        return try {
            val resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString())
            when (resp.statusCode()) {
                200 -> true
                404 -> {
                    log.warn("ms-auth: login não encontrado para troca de senha email={}", email)
                    false
                }
                else -> {
                    log.warn("ms-auth PATCH senha status={} body={}", resp.statusCode(), resp.body())
                    false
                }
            }
        } catch (ex: Exception) {
            log.warn("ms-auth indisponível ao atualizar senha: {}", ex.message)
            false
        }
    }
}
