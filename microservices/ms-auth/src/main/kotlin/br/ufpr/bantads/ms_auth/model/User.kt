package br.ufpr.bantads.ms_auth.model

import jakarta.persistence.*

@Entity // Diz que esta classe é uma tabela no banco de dados
@Table(name = "usuarios")
class User(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,
    
    @Column(unique = true)
    val login: String,
    
    val senha: String,
    val nome: String,
    val perfil: String // CLIENTE, GERENTE, ADMIN
)