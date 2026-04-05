package bantads.auth

import bantads.auth.dto.LoginRequest
import com.fasterxml.jackson.databind.ObjectMapper
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Tag
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.test.web.servlet.setup.MockMvcBuilders
import org.springframework.web.context.WebApplicationContext
import org.testcontainers.containers.MongoDBContainer
import org.testcontainers.containers.RabbitMQContainer
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import org.testcontainers.utility.DockerImageName

/**
 * Integração HTTP + MongoDB + RabbitMQ (Testcontainers). Requer Docker.
 */
@SpringBootTest
@Testcontainers(disabledWithoutDocker = true)
@Tag("integration")
class MsAuthIntegrationTest {

    @Autowired
    private lateinit var webApplicationContext: WebApplicationContext

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    private lateinit var mockMvc: MockMvc

    @BeforeEach
    fun setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build()
    }

    companion object {
        @Container
        @JvmStatic
        val mongo: MongoDBContainer = MongoDBContainer(DockerImageName.parse("mongo:7.0"))

        @Container
        @JvmStatic
        val rabbit: RabbitMQContainer = RabbitMQContainer(DockerImageName.parse("rabbitmq:3.13-alpine"))

        @JvmStatic
        @DynamicPropertySource
        fun properties(registry: DynamicPropertyRegistry) {
            registry.add("spring.mongodb.uri") {
                "mongodb://${mongo.host}:${mongo.getMappedPort(27017)}/auth_it"
            }
            registry.add("spring.rabbitmq.host") { rabbit.host }
            registry.add("spring.rabbitmq.port") { rabbit.getMappedPort(5672) }
        }
    }

    @Test
    fun `login com seed retorna access_token e token_type Bearer`() {
        val body = LoginRequest(login = "cli1@bantads.com.br", senha = "tads")
        mockMvc.perform(
            post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.access_token").exists())
            .andExpect(jsonPath("$.token_type").value("Bearer"))
            .andExpect(jsonPath("$.tipo").value("CLIENTE"))
            .andExpect(jsonPath("$.usuario.cpf").value("12912861012"))
    }

    @Test
    fun `login senha invalida retorna 401`() {
        val body = LoginRequest(login = "cli1@bantads.com.br", senha = "errada")
        mockMvc.perform(
            post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)),
        )
            .andExpect(status().isUnauthorized)
    }

    @Test
    fun `logout com Bearer retorna dados do gerente`() {
        val loginJson = objectMapper.writeValueAsString(
            LoginRequest(login = "ger1@bantads.com.br", senha = "tads"),
        )
        val mvcResult = mockMvc.perform(
            post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginJson),
        )
            .andExpect(status().isOk)
            .andReturn()

        val token = objectMapper.readTree(mvcResult.response.contentAsString).get("access_token").asText()

        mockMvc.perform(
            post("/auth/logout")
                .header("Authorization", "Bearer $token"),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.cpf").value("98574307084"))
            .andExpect(jsonPath("$.email").value("ger1@bantads.com.br"))
            .andExpect(jsonPath("$.tipo").value("GERENTE"))
    }

    @Test
    fun `reboot retorna 200`() {
        mockMvc.perform(get("/auth/reboot"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.message").exists())
    }
}
