package bantads.auth.repository

import bantads.auth.model.User
import org.springframework.data.mongodb.repository.MongoRepository
import org.springframework.stereotype.Repository

@Repository
interface UserRepository : MongoRepository<User, String> {
    fun findByLogin(login: String): User?

    fun existsByLogin(login: String): Boolean

    fun deleteByLogin(login: String): Long
}
