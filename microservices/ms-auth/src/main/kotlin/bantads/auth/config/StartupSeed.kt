package bantads.auth.config

import bantads.auth.repository.UserRepository
import bantads.auth.service.AuthSeedService
import jakarta.annotation.PostConstruct
import org.springframework.stereotype.Component

/** Garante base utilizável no primeiro start (coleção vazia). */
@Component
class StartupSeed(
    private val userRepository: UserRepository,
    private val authSeedService: AuthSeedService,
) {
    @PostConstruct
    fun seedIfEmpty() {
        if (userRepository.count() == 0L) {
            authSeedService.seed()
        }
    }
}
