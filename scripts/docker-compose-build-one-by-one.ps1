# Prepara imagens do compose em serie (1 de cada vez) — menos pico de RAM/CPU no Docker Desktop.
# Infra (só image:) usa pull; microsserviços front/gateway usam build.
# Uso: .\scripts\docker-compose-build-one-by-one.ps1
# Com rebuild forçado das imagens locais: .\scripts\docker-compose-build-one-by-one.ps1 -NoCache

param(
    [switch] $NoCache
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

# Serviços sem build: no Dockerfile no repo — apenas baixar imagem base do registry.
$infraServices = @(
    "rabbitmq",
    "mongo-auth",
    "db-cliente",
    "db-conta",
    "db-gerente",
    "mailhog"
)

$buildServices = @(
    "ms-auth",
    "ms-cliente",
    "ms-conta",
    "ms-gerente",
    "ms-saga",
    "ms-email",
    "frontend",
    "gateway"
)

foreach ($s in $infraServices) {
    Write-Host "`n=== docker compose pull $s ===" -ForegroundColor Cyan
    docker compose pull $s
}

foreach ($s in $buildServices) {
    Write-Host "`n=== docker compose build $s ===" -ForegroundColor Cyan
    if ($NoCache) {
        docker compose build --no-cache $s
    }
    else {
        docker compose build $s
    }
}

Write-Host "`nConcluido." -ForegroundColor Green
