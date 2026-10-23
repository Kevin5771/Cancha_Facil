$ErrorActionPreference = 'Stop'
$projectPath = Split-Path -Parent $PSScriptRoot
$dataPath = Join-Path $projectPath '.local/postgres'
$logPath = Join-Path $projectPath '.local/postgres.log'
$pgControl = 'C:/Program Files/PostgreSQL/18/bin/pg_ctl.exe'
if (-not (Test-Path -LiteralPath (Join-Path $dataPath 'PG_VERSION'))) {
    throw 'No existe la instancia PostgreSQL local de este proyecto.'
}
if (-not (Test-Path -LiteralPath $pgControl)) {
    throw 'No se encontró PostgreSQL 18. Ajusta pgControl a la instalación de tu equipo.'
}
& $pgControl -D $dataPath status *> $null
if ($LASTEXITCODE -eq 0) {
    Write-Output 'La base local ya está encendida.'
    exit 0
}
& $pgControl -D $dataPath -l $logPath -o '-p 5433 -h 127.0.0.1' -w start
if ($LASTEXITCODE -ne 0) { throw 'No se pudo iniciar PostgreSQL local.' }
