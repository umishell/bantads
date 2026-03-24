package br.ufpr.bantads.ms_auth.repository

import br.ufpr.bantads.ms_auth.model.User
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface UserRepository : JpaRepository<User, Long> {
    // O Spring gera o SQL "SELECT * FROM usuarios WHERE login = ?" automaticamente!
    fun findByLogin(login: String): User?
}