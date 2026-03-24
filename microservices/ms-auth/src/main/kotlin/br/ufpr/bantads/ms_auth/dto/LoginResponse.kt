package br.ufpr.bantads.ms_auth.dto

data class LoginResponse(
    val token: String,    // O JWT que o Gateway vai validar nas próximas requisições
    val nome: String,     // Para exibir "Olá, Michel" no header do site
    val perfil: String    // CLIENTE, GERENTE ou ADMIN (para o Angular liberar as rotas certas)
)