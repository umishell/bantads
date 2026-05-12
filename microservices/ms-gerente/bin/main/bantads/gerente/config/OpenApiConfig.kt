package bantads.gerente.config

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
                    .title("BANTADS — ms-gerente")
                    .description(
                        "CRUD de gerentes (R17-R20), dashboard do administrador (R15) e " +
                            "fluxo de escolha de gerente para autocadastro via RabbitMQ.",
                    )
                    .version("v1"),
            )
            .addSecurityItem(SecurityRequirement().addList("bearerAuth"))
            .components(Components().addSecuritySchemes("bearerAuth", bearer))
    }
}
