package bantads.auth

import bantads.auth.dto.LoginRequest
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.kotlinModule
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class LoginRequestJsonTest {

    private val mapper = ObjectMapper().registerModule(kotlinModule())

    @Test
    fun `JSON com email em vez de login deserializa no campo login`() {
        val json = """{"email":"cli1@bantads.com.br","senha":"tads"}"""
        val req = mapper.readValue(json, LoginRequest::class.java)
        assertEquals("cli1@bantads.com.br", req.login)
        assertEquals("tads", req.senha)
    }

    @Test
    fun `JSON com login continua funcionando`() {
        val json = """{"login":"cli1@bantads.com.br","senha":"tads"}"""
        val req = mapper.readValue(json, LoginRequest::class.java)
        assertEquals("cli1@bantads.com.br", req.login)
    }
}
