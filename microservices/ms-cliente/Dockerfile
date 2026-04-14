# syntax=docker/dockerfile:1
# BuildKit: cache do Gradle entre builds (senão bootJar parece “travar” minutos baixando deps + compilando).
FROM eclipse-temurin:24-jdk-noble AS build
WORKDIR /app

COPY gradlew .
COPY gradle gradle
COPY build.gradle.kts .
COPY settings.gradle.kts .
COPY gradle.properties .

RUN sed -i 's/\r$//' gradlew && chmod +x gradlew

RUN --mount=type=cache,target=/root/.gradle \
    ./gradlew dependencies --no-daemon

COPY src src

RUN --mount=type=cache,target=/root/.gradle \
    ./gradlew bootJar --no-daemon -x test

FROM eclipse-temurin:24-jre-noble
WORKDIR /app

RUN groupadd --system spring && useradd --system --gid spring spring
USER spring

COPY --from=build /app/build/libs/*.jar app.jar

EXPOSE 8082

ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
