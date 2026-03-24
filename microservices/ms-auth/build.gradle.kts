plugins {
    val kotlinVersion = "2.2.21"
    kotlin("jvm") version kotlinVersion
    kotlin("plugin.spring") version kotlinVersion
    kotlin("plugin.jpa") version kotlinVersion // Vital para Hibernate + Kotlin
    
    id("org.springframework.boot") version "4.0.3"
    id("io.spring.dependency-management") version "1.1.7"
}

group = "br.ufpr.bantads"
version = "0.0.1-SNAPSHOT"
description = "BANTADS - Microsserviço de Autenticação"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories {
    mavenCentral()
}

dependencies {
    // --- WEB & VALIDATION ---
    implementation("org.springframework.boot:spring-boot-starter-web") // Troquei webmvc por web (mais padrão)
    implementation("org.springframework.boot:spring-boot-starter-validation")
    
    // --- PERSISTÊNCIA & SEGURANÇA ---
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-security")
    runtimeOnly("org.postgresql:postgresql")
    
    // --- MONITORAMENTO ---
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    
    // --- MENSAGERIA (RabbitMQ para SAGA) ---
    implementation("org.springframework.boot:spring-boot-starter-amqp")
    
    // --- KOTLIN & JSON ---
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    
    // --- JWT ---
    implementation("io.jsonwebtoken:jjwt-api:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.6")

    // --- TESTES ---
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")
}

kotlin {
    compilerOptions {
        // -Xjsr305=strict garante que o Kotlin trate anotações de Nullable do Java com rigor
        freeCompilerArgs.addAll("-Xjsr305=strict", "-Xannotation-default-target=param-property")
    }
}

// Configuração para o JPA: faz com que as classes com @Entity sejam 'open' automaticamente
allOpen {
    annotation("jakarta.persistence.Entity")
    annotation("jakarta.persistence.MappedSuperclass")
    annotation("jakarta.persistence.Embeddable")
}

tasks.withType<Test> {
    useJUnitPlatform()
}