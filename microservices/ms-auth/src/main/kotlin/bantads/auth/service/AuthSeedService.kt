package bantads.auth.service

import bantads.auth.model.User
import bantads.auth.repository.UserRepository
import bantads.auth.security.Sha256SaltPasswordHasher
import org.springframework.stereotype.Service

@Service
class AuthSeedService(
    private val userRepository: UserRepository,
    private val passwordHasher: Sha256SaltPasswordHasher,
) {

    /**
     * Dados pré-cadastrados do trabalho BANTADS (clientes + gerentes + administrador).
     * Senha de todos: "tads"
     */
    fun seed() {
        userRepository.deleteAll()

        val senhaPadrao = "tads"
        val linhas = listOf(
            SeedRow("12912861012", "Catharyna", "cli1@bantads.com.br", "CLIENTE"),
            SeedRow("09506382000", "Cleuddônio", "cli2@bantads.com.br", "CLIENTE"),
            SeedRow("85733854057", "Catianna", "cli3@bantads.com.br", "CLIENTE"),
            SeedRow("58872160006", "Cutardo", "cli4@bantads.com.br", "CLIENTE"),
            SeedRow("76179646090", "Coândrya", "cli5@bantads.com.br", "CLIENTE"),
            SeedRow("98574307084", "Geniéve", "ger1@bantads.com.br", "GERENTE"),
            SeedRow("64065268052", "Godophredo", "ger2@bantads.com.br", "GERENTE"),
            SeedRow("23862179060", "Gyândula", "ger3@bantads.com.br", "GERENTE"),
            SeedRow("40501740066", "Adamântio", "adm1@bantads.com.br", "ADMINISTRADOR"),
        )

        val usuarios = linhas.map { row ->
            val h = passwordHasher.hash(senhaPadrao)
            User(
                login = row.email,
                senhaHash = h.hashHex,
                salt = h.saltHex,
                nome = row.nome,
                cpf = row.cpf,
                perfil = row.perfil,
            )
        }
        userRepository.saveAll(usuarios)
    }

    private data class SeedRow(val cpf: String, val nome: String, val email: String, val perfil: String)
}
