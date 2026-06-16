package bantads.auth.dto

import com.fasterxml.jackson.annotation.JsonProperty
data class LoginResponse(
    @JsonProperty("access_token") val accessToken: String,
    @JsonProperty("token_type") val tokenType: String = "Bearer",
    val tipo: String,
    val usuario: UsuarioLoginResponse,
)
