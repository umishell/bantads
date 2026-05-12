$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$IntegrationDir = Join-Path $RepoRoot "scripts\integration"
$WorkingReports = Join-Path $RepoRoot "testReports\working"
$IssuesReports = Join-Path $RepoRoot "testReports\issues"

New-Item -ItemType Directory -Force -Path $WorkingReports | Out-Null
New-Item -ItemType Directory -Force -Path $IssuesReports | Out-Null

Push-Location $IntegrationDir
try {
    python -m pip install -q -r requirements.txt
    $stamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd_HH-mm-ss") + "_UTC"
    $env:BANTADS_REPORT_STAMP = $stamp
    $junit = Join-Path $WorkingReports "junit_$stamp.xml"
    $env:PYTHONPATH = $IntegrationDir
    python -m pytest tests -v --tb=short --junitxml="$junit" -c pytest.ini
    exit $LASTEXITCODE
}
finally {
    Pop-Location
}
