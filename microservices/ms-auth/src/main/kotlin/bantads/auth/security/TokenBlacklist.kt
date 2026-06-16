package bantads.auth.security

import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap
@Component
class TokenBlacklist {

    private val logger = LoggerFactory.getLogger(javaClass)
    private val revogados: MutableMap<String, Instant> = ConcurrentHashMap()

    fun revogar(token: String, expiraEm: Instant) {
        val chave = hash(token)
        revogados[chave] = expiraEm
        logger.debug("Token revogado (hash={}). Total ativo={}", chave.take(10), revogados.size)
    }

    fun isRevogado(token: String): Boolean {
        val chave = hash(token)
        val expira = revogados[chave] ?: return false
        return if (expira.isAfter(Instant.now())) {
            true
        } else {
            revogados.remove(chave)
            false
        }
    }

    @Scheduled(fixedDelay = 60_000)
    fun limparExpirados() {
        val agora = Instant.now()
        val removidos = revogados.entries.removeIf { it.value.isBefore(agora) }
        if (removidos) logger.debug("TokenBlacklist limpeza; restantes={}", revogados.size)
    }

    private fun hash(token: String): String =
        MessageDigest.getInstance("SHA-256")
            .digest(token.toByteArray(StandardCharsets.UTF_8))
            .joinToString("") { "%02x".format(it) }
}
