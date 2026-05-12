package bantads.cliente.config

import io.swagger.v3.oas.models.Components
import io.swagger.v3.oas.models.OpenAPI
import io.swagger.v3.oas.models.info.Info
import io.swagger.v3.oas.models.security.SecurityRequirement
import io.swagger.v3.oas.models.security.SecurityScheme
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
class OpenApiConfig {

    @Bean
    fun openApi(): OpenAPI {
        val bearer = SecurityScheme()
            .type(SecurityScheme.Type.HTTP)
            .scheme("bearer")
            .bearerFormat("JWT")
            .`in`(SecurityScheme.In.HEADER)
            .name("Authorization")
        return OpenAPI()
            .info(
                Info()
                    .title("BANTADS — ms-cliente")
                    .description(
                        "Autocadastro, listagem de pendentes, aprovação/rejeição. " +
                            "Participa da saga de autocadastro (RabbitMQ).",
                    )
                    .version("v1"),
            )
            .addSecurityItem(SecurityRequirement().addList("bearerAuth"))
            .components(Components().addSecuritySchemes("bearerAuth", bearer))
    }
}
