$ErrorActionPreference = "Stop"

# Starts backend + frontend without opening log files in Notepad.
# Output is redirected to ./logs so nothing gets auto-opened.

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$logs = Join-Path $root "logs"
New-Item -ItemType Directory -Force -Path $logs | Out-Null

function Start-ProcSilent {
  param(
    [Parameter(Mandatory=$true)][string]$FilePath,
    [Parameter(Mandatory=$false)][string[]]$ArgumentList = @(),
    [Parameter(Mandatory=$true)][string]$WorkingDirectory,
    [Parameter(Mandatory=$true)][string]$OutFile,
    [Parameter(Mandatory=$true)][string]$ErrFile
  )

  Start-Process `
    -WindowStyle Hidden `
    -FilePath $FilePath `
    -ArgumentList $ArgumentList `
    -WorkingDirectory $WorkingDirectory `
    -RedirectStandardOutput $OutFile `
    -RedirectStandardError $ErrFile | Out-Null
}

# Kill existing node dev servers (safe for local dev)
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# Backend
Start-ProcSilent `
  -FilePath "node" `
  -ArgumentList @("src/index.js") `
  -WorkingDirectory (Join-Path $root "backend") `
  -OutFile (Join-Path $logs "backend.out.log") `
  -ErrFile (Join-Path $logs "backend.err.log")

# Frontend (port 3001 to avoid conflicts)
$npm = (Get-Command npm -ErrorAction Stop).Source
Start-ProcSilent `
  -FilePath $npm `
  -ArgumentList @("run","dev","--","-p","3001") `
  -WorkingDirectory (Join-Path $root "frontend") `
  -OutFile (Join-Path $logs "frontend.out.log") `
  -ErrFile (Join-Path $logs "frontend.err.log")

Write-Output "Started:"
Write-Output "  Backend:  http://127.0.0.1:5000"
Write-Output "  Frontend: http://localhost:3001"

exit 0
