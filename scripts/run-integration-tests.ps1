param(
    [switch]$FullTrace,
    [switch]$NoLogFile,
    [switch]$NoDockerLogs,
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$PytestArgs
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$IntegrationDir = Join-Path $RepoRoot "scripts\integration"
$LogsDir = Join-Path $RepoRoot "testReports\logs"
$JunitDir = Join-Path $LogsDir "junit"
$PytestDir = Join-Path $LogsDir "pytest"
$DockerDir = Join-Path $LogsDir "docker"
$WorkingDir = Join-Path $RepoRoot "testReports\working"
$ComposeFile = Join-Path $RepoRoot "docker-compose.yml"

$DockerServices = @(
    "gateway", "ms-auth", "ms-cliente", "ms-conta", "ms-gerente", "ms-saga", "ms-email"
)

# Caminhos com ``[leva]`` (ex. ``5.17[19-50]``) não podem usar -Path/Tee-Object -FilePath: ``[]`` é curinga no PS.
function Invoke-PytestWithConsoleLog {
    param(
        [string[]]$PytestArgs,
        [string]$LogPath
    )
    $utf8 = New-Object System.Text.UTF8Encoding $false
    $writer = [System.IO.StreamWriter]::new($LogPath, $false, $utf8)
    $exitCode = 1
    try {
        Write-Host "Iniciando pytest (saída em tempo real)..." -ForegroundColor Cyan
        $writer.WriteLine("# pytest $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
        $writer.Flush()

        # Sem ``-u`` / streaming, o pytest bufferiza e parece travado até o fim da suíte.
        $savedEap = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        try {
            & python -u -m pytest @PytestArgs 2>&1 | ForEach-Object {
                $text = if ($_ -is [System.Management.Automation.ErrorRecord]) {
                    if ($_.Exception.Message) { $_.Exception.Message } else { $_.ToString() }
                } else {
                    "$_"
                }
                if ([string]::IsNullOrWhiteSpace($text)) { return }
                Write-Host $text
                $writer.WriteLine($text)
                $writer.Flush()
            }
            $exitCode = $LASTEXITCODE
        } finally {
            $ErrorActionPreference = $savedEap
        }
        if ($null -eq $exitCode) { $exitCode = 1 }
        return [int]$exitCode
    } finally {
        $writer.Dispose()
    }
}

function Write-DockerComposeSnapshot {
    param(
        [string]$OutFile,
        [int]$Tail,
        [string]$ComposeFilePath
    )
    $header = @(
        "# Docker Compose - snapshot pos-testes de integracao",
        "# Gerado: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
        "# Comando base: docker compose logs --tail=$Tail --timestamps <servico>",
        ""
    )
    Set-Content -LiteralPath $OutFile -Value ($header -join "`n") -Encoding utf8

    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Add-Content -LiteralPath $OutFile -Value "docker CLI não encontrado no PATH."
        return
    }
    if (-not (Test-Path -LiteralPath $ComposeFilePath)) {
        Add-Content -LiteralPath $OutFile -Value "docker-compose.yml não encontrado: $ComposeFilePath"
        return
    }

    Push-Location $RepoRoot
    try {
        foreach ($svc in $DockerServices) {
            $sep = "`n========== $svc (últimas $Tail linhas) ==========`n"
            Add-Content -LiteralPath $OutFile -Value $sep -Encoding utf8
            try {
                $chunk = docker compose -f $ComposeFilePath logs --tail=$Tail --timestamps $svc 2>&1
                if ($chunk) {
                    Add-Content -LiteralPath $OutFile -Value ($chunk | Out-String) -Encoding utf8
                }
            } catch {
                Add-Content -LiteralPath $OutFile -Value "Erro ao coletar logs de ${svc}: $_" -Encoding utf8
            }
        }
    } finally {
        Pop-Location
    }
}

New-Item -ItemType Directory -Force -Path $LogsDir, $JunitDir, $PytestDir, $DockerDir, $WorkingDir | Out-Null

Push-Location $IntegrationDir
try {
    python -m pip install -q -r requirements.txt
    $env:PYTHONPATH = $IntegrationDir
    if (-not $env:BANTADS_POLL_VERBOSE) { $env:BANTADS_POLL_VERBOSE = "1" }
    if (-not $env:BANTADS_SAGA_WAIT_S) { $env:BANTADS_SAGA_WAIT_S = "120" }
    $env:PYTHONUNBUFFERED = "1"

    $names = python -m lib.report_names | ConvertFrom-Json
    $env:BANTADS_REPORT_BATCH_ID = $names.batch_id
    $env:BANTADS_REPORT_STAMP = $names.stamp
    $junit = [System.IO.Path]::Combine($JunitDir, $names.junit)
    $consoleLog = [System.IO.Path]::Combine($PytestDir, $names.console_log)
    $dockerLog = [System.IO.Path]::Combine($DockerDir, $names.docker_logs)

    $pytest = @(
        "tests", "-v", "--tb=short", "-c", "pytest.ini",
        "--junitxml=$junit"
    )
    if ($FullTrace -or $env:BANTADS_PYTEST_FULL_TRACE -eq "1") {
        $pytest += "--full-trace"
    }
    if ($PytestArgs.Count -gt 0) {
        $pytest += $PytestArgs
    }

    Write-Host "logs: $LogsDir" -ForegroundColor DarkGray
    Write-Host "logs/junit: $JunitDir" -ForegroundColor DarkGray
    Write-Host "logs/pytest: $PytestDir" -ForegroundColor DarkGray
    Write-Host "logs/docker: $DockerDir" -ForegroundColor DarkGray
    Write-Host "pytest: python -m pytest $($pytest -join ' ')" -ForegroundColor DarkGray
    if (-not $NoLogFile) {
        Write-Host "console log: $consoleLog" -ForegroundColor DarkGray
        $exitCode = Invoke-PytestWithConsoleLog -PytestArgs $pytest -LogPath $consoleLog
    } else {
        Write-Host "Iniciando pytest..." -ForegroundColor Cyan
        & python -u -m pytest @pytest
        $exitCode = $LASTEXITCODE
    }

    $dockerMode = if ($env:BANTADS_DOCKER_LOGS) { $env:BANTADS_DOCKER_LOGS } else { "on-fail" }
    $dockerTail = 120
    if ($env:BANTADS_DOCKER_LOG_TAIL) {
        [void][int]::TryParse($env:BANTADS_DOCKER_LOG_TAIL, [ref]$dockerTail)
    }
    $captureDocker = -not $NoDockerLogs -and $dockerMode -ne "never" -and (
        $dockerMode -eq "always" -or $exitCode -ne 0
    )
    if ($captureDocker) {
        Write-Host "docker snapshot: $dockerLog (tail=$dockerTail, mode=$dockerMode)" -ForegroundColor DarkGray
        Write-DockerComposeSnapshot -OutFile $dockerLog -Tail $dockerTail -ComposeFilePath $ComposeFile
    }

    exit $exitCode
}
finally {
    Pop-Location
}
