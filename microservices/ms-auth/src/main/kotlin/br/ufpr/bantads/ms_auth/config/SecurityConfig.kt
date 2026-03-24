package br.ufpr.bantads.ms_auth.config

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.web.SecurityFilterChain

@Configuration
class SecurityConfig {

    @Bean
    fun passwordEncoder(): BCryptPasswordEncoder {
        return BCryptPasswordEncoder()
    }

    @Bean
    fun filterChain(http: HttpSecurity): SecurityFilterChain {
        http.csrf { it.disable() } // Desabilita CSRF para APIs REST
            .authorizeHttpRequests { it.anyRequest().permitAll() } // O Gateway cuidará da segurança
        return http.build()
    }
}