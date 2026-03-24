# Estágio 1: Build
# Usamos a imagem completa do JDK para compilar o código
FROM eclipse-temurin:21-jdk-jammy AS build
WORKDIR /app

# Copiamos apenas os arquivos de configuração do Gradle primeiro para aproveitar o cache do Docker
COPY gradlew .
COPY gradle gradle
COPY build.gradle.kts .
COPY settings.gradle.kts .

# Baixa as dependências (isso economiza tempo em builds futuros se você não mudar o build.gradle)
RUN ./gradlew dependencies --no-daemon

# Copia o código fonte e gera o JAR
COPY src src
RUN ./gradlew bootJar --no-daemon

# Estágio 2: Runtime
# Usamos uma imagem JRE (Java Runtime Environment) muito mais leve para rodar o app
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

# Criamos um usuário do sistema para não rodar a aplicação como root (Segurança Sênior)
RUN addgroup --system spring && adduser --system spring --ingroup spring
USER spring

# Copiamos apenas o JAR gerado no estágio de build
COPY --from=build /app/build/libs/*.jar app.jar

# Porta que definimos no application.yml
EXPOSE 8081

# Comando para iniciar a aplicação
# Usamos flags de otimização de memória para containers
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]