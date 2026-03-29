package bantads.auth.security

import org.springframework.stereotype.Component
import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import java.security.SecureRandom

/**
 * Senhas conforme especificação DAC: SHA-256 com salt aleatório por usuário.
 * Armazena-se o salt em texto hex junto ao hash hex de 256 bits.
 */
@Component
class Sha256SaltPasswordHasher {

    private val random = SecureRandom()

    data class HashResult(val saltHex: String, val hashHex: String)

    fun hash(plainPassword: String): HashResult {
        val salt = ByteArray(16).also { random.nextBytes(it) }
        val saltHex = salt.toHexString()
        val hashHex = digest(salt, plainPassword)
        return HashResult(saltHex, hashHex)
    }

    fun matches(plainPassword: String, saltHex: String, storedHashHex: String): Boolean {
        val salt = saltHex.hexToBytes()
        val md = MessageDigest.getInstance("SHA-256")
        md.update(salt)
        md.update(plainPassword.toByteArray(StandardCharsets.UTF_8))
        val computed = md.digest()
        val expected = storedHashHex.hexToBytes()
        return computed.size == expected.size && MessageDigest.isEqual(computed, expected)
    }

    private fun digest(salt: ByteArray, plainPassword: String): String {
        val md = MessageDigest.getInstance("SHA-256")
        md.update(salt)
        md.update(plainPassword.toByteArray(StandardCharsets.UTF_8))
        return md.digest().toHexString()
    }

    private fun ByteArray.toHexString(): String = joinToString("") { "%02x".format(it) }

    private fun String.hexToBytes(): ByteArray {
        require(length % 2 == 0)
        return ByteArray(length / 2) { i ->
            substring(i * 2, i * 2 + 2).toInt(16).toByte()
        }
    }
}
