package br.ufpr.bantads.ms_auth.dto

data class LogoutResponse(
    val message: String = "Logout efetuado com sucesso. Remova o token do cliente."
)