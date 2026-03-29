package bantads.auth

import bantads.auth.security.Sha256SaltPasswordHasher
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class Sha256SaltPasswordHasherTest {

    private val hasher = Sha256SaltPasswordHasher()

    @Test
    fun `hash e verify com mesma senha`() {
        val h = hasher.hash("tads")
        assertTrue(hasher.matches("tads", h.saltHex, h.hashHex))
    }

    @Test
    fun `verify falha com senha errada`() {
        val h = hasher.hash("tads")
        assertFalse(hasher.matches("outra", h.saltHex, h.hashHex))
    }

    @Test
    fun `dois hashes da mesma senha têm salt diferente`() {
        val a = hasher.hash("tads")
        val b = hasher.hash("tads")
        assertTrue(a.saltHex != b.saltHex)
        assertTrue(hasher.matches("tads", a.saltHex, a.hashHex))
        assertTrue(hasher.matches("tads", b.saltHex, b.hashHex))
    }
}
