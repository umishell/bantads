package bantads.auth.dto

import com.fasterxml.jackson.annotation.JsonProperty

/** Formato exigido pelo trabalho DAC / test_dac; `token_type` em estilo OAuth2 (Bearer). */
data class LoginResponse(
    @JsonProperty("access_token") val accessToken: String,
    @JsonProperty("token_type") val tokenType: String = "Bearer",
    val tipo: String,
    val usuario: UsuarioLoginResponse,
)
