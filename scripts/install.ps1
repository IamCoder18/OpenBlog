# ─────────────────────────────────────────────────────────────────────────────
# OpenBlog — interactive installer (PowerShell)
# ─────────────────────────────────────────────────────────────────────────────
# Native Windows counterpart to scripts/install.sh.
#
# Usage:
#   .\scripts\install.ps1                                              # interactive
#   .\scripts\install.ps1 -NonInteractive                               # accept defaults
#   .\scripts\install.ps1 -BaseUrl https://blog.example.com …          # image-pull mode
#   .\scripts\install.ps1 -LocalBuild …                                 # build from source
#
# See ./scripts/install.sh for the full flag reference.
# ─────────────────────────────────────────────────────────────────────────────
[CmdletBinding()]
param(
  [switch]$NonInteractive = $false,
  [switch]$Yes = $false,

  [string]$BaseUrl = "",
  [string]$BlogName = "",
  [string]$SignUpEnabled = "",

  [string]$AdminEmail = "",
  [string]$AdminName = "",
  [string]$AdminPassword = "",

  [int]$Port = 3000,
  [int]$PostgresPort = 5432,
  [string]$Image = "ghcr.io/iamcoder18/openblog:latest",
  [switch]$LocalBuild = $false,

  [string]$ProjectName = "openblog",
  [switch]$Help
)

$ErrorActionPreference = "Stop"

if ($Help) { Get-Help $MyInvocation.MyCommand.Path -Full | Out-String | Out-Host; exit 0 }

# ─── TTY detection ─────────────────────────────────────────────────────────
try { if ([Console]::IsInputRedirected) { $NonInteractive = $true } } catch {}
if ($Yes) { $NonInteractive = $true }
if (-not $NonInteractive) {
  try { if ($Host.Name -eq "ServerRemoteHost") { $NonInteractive = $true } } catch {}
}

# ─── Colors (PS 7+ / modern terminals) ─────────────────────────────────────
$script:SupportsColor = $false
try {
  if ($PSVersionTable.PSVersion.Major -ge 7) { $script:SupportsColor = $true }
  elseif ($env:TERM -ne 'dumb') { $script:SupportsColor = $true }
} catch {}
$script:C  = if ($script:SupportsColor) { "`e[36m" } else { "" }
$script:B  = if ($script:SupportsColor) { "`e[1m"  } else { "" }
$script:D  = if ($script:SupportsColor) { "`e[2m"  } else { "" }
$script:G  = if ($script:SupportsColor) { "`e[32m" } else { "" }
$script:Y  = if ($script:SupportsColor) { "`e[33m" } else { "" }
$script:R  = if ($script:SupportsColor) { "`e[31m" } else { "" }
$script:M  = if ($script:SupportsColor) { "`e[35m" } else { "" }
$script:BL = if ($script:SupportsColor) { "`e[34m" } else { "" }
$script:X  = if ($script:SupportsColor) { "`e[0m"  } else { "" }

Function Write-Banner {
  Clear-Host
  Write-Host "$script:BL$script:B   ____                  ______ _ _               $script:X"
  Write-Host "$script:BL$script:B  / __ \                |  ____(_) |              $script:X"
  Write-Host "$script:BL$script:B | |  | |_ __   ___ _ __| |__   _| | ___   __ _   $script:X"
  Write-Host "$script:BL$script:B | |  | | '_ \ / _ \ '_ \  __| | | |/ _ \ / _` |   $script:X"
  Write-Host "$script:BL$script:B | |__| | |_) |  __/ | | | |  | | | | (_) | (_| |   $script:X"
  Write-Host "$script:BL$script:B  \____/| .__/ \___|_| |_|  |_|_|_|\___/ \__, |   $script:X"
  Write-Host "$script:BL$script:B        | |                            __/ |   $script:X"
  Write-Host "$script:BL$script:B        |_|       setup assistant    |___/    $script:X"
  Write-Host "$script:D  Modern publishing for humans and machines.$script:X"
}

Function Write-Box { param($t) Write-Host "$script:C$script:B╭─────────────────────────────────────────────╮$script:X`n$script:C$script:B│$script:X  $script:B$t$script:X`n$script:C$script:B╰─────────────────────────────────────────────╯$script:X" }
Function Write-Step { param($m) Write-Host "  $script:BL▸$script:X $m" }
Function Write-Ok   { param($m) Write-Host "  $script:G✓$script:X $m" }
Function Write-Warn { param($m) Write-Host "  $script:Y!$script:X $m" }
Function Write-Fail { param($m) Write-Host "  $script:R✗$script:X $m"; Write-Host "`n$script:R$script:BAborted.$script:X"; exit 1 }
Function Read-Prompt { param($p,$d="")
  if ($d -ne "") { Write-Host "  $script:M$script:B?$script:X $p $script:D$d$script:X" }
  else          { Write-Host "  $script:M$script:B?$script:X $p" }
  $a = Read-Host "  $script:M$script:B›$script:X"
  if ([string]::IsNullOrWhiteSpace($a)) { return $d } else { return $a }
}
Function Read-Secret { param($p)
  Write-Host "  $script:M$script:B?$script:X $p $script:D(input hidden)$script:X"
  $s1 = Read-Host "  $script:M$script:B›$script:X" -AsSecureString
  Write-Host "  $script:M$script:B?$script:X Confirm password"
  $s2 = Read-Host "  $script:M$script:B›$script:X" -AsSecureString
  $b1 = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s1)
  $b2 = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s2)
  try { $p1 = [Runtime.InteropServices.Marshal]::PtrToStringAuto($b1); $p2 = [Runtime.InteropServices.Marshal]::PtrToStringAuto($b2) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b1); [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b2) }
  if ($p1 -ne $p2) { Write-Fail "Passwords do not match." }
  return $p1
}

# ─── Compose file selection ─────────────────────────────────────────────────
if ($LocalBuild) {
  if (-not (Test-Path "Dockerfile")) {
    Write-Fail "-LocalBuild requires the source repo (Dockerfile not found in $(Get-Location))."
  }
  if     (Test-Path "docker-compose.local.yaml") { $ComposeFile = "docker-compose.local.yaml" }
  elseif (Test-Path "docker-compose.yaml")       { $ComposeFile = "docker-compose.yaml" }
  else { Write-Fail "-LocalBuild needs docker-compose.local.yaml or docker-compose.yaml in $(Get-Location)." }
} else {
  if     (Test-Path "docker-compose.yaml")       { $ComposeFile = "docker-compose.yaml" }
  elseif (Test-Path "docker-compose.local.yaml") { Write-Warn "docker-compose.yaml not found — falling back to docker-compose.local.yaml."; $ComposeFile = "docker-compose.local.yaml"; $LocalBuild = $true }
  else { Write-Fail "No compose file found in $(Get-Location). Download docker-compose.yaml from https://github.com/IamCoder18/OpenBlog." }
}
Write-Step "Using compose file: $script:B$ComposeFile$script:X"

# ─── Banner + Docker check ─────────────────────────────────────────────────
Write-Banner
Write-Box "What this does"
Write-Step "Verify Docker is installed and the daemon is running"
Write-Step "Generate a $script:B AUTH_SECRET$script:X and write $script:B .env$script:X"
if ($LocalBuild) { Write-Step "Build the OpenBlog image from source (~3–5 min on first run)" }
else             { Write-Step "Pull the OpenBlog image: $script:B$Image$script:X" }
Write-Step "Start Postgres + the Next.js app, run migrations"
Write-Step "Create your first admin user"
Write-Host "$script:D────────────────────────────────────────────────────────$script:X"
Write-Host ""

Write-Box "Checking Docker"
$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerCmd) { Write-Fail "Docker is not installed. Install Docker Desktop from https://docs.docker.com/get-docker/" }
Write-Ok "docker found: $script:D$(docker --version)$script:X"
try {
  $cv = docker compose version --short 2>&1
  if ($LASTEXITCODE -ne 0) { throw "no compose plugin" }
  Write-Ok "docker compose plugin found: $script:D$cv$script:X"
} catch { Write-Fail "Docker Compose v2 plugin not found." }
try { docker info | Out-Null; if ($LASTEXITCODE -ne 0) { throw "daemon" }; Write-Ok "Docker daemon is running" }
catch { Write-Host ""; Write-Warn "Docker is installed but the daemon isn't responding. Start Docker Desktop."; exit 1 }
Write-Host ""

# ─── Configuration ─────────────────────────────────────────────────────────
if (-not $NonInteractive) {
  Write-Box "Configuration"
  if (Test-Path ".env") {
    Write-Warn "An .env file already exists."
    $overwrite = Read-Host "  $script:M$script:B›$script:X Overwrite? [y/N]"
    if ($overwrite -notmatch "^(y|yes)$") { $SkipEnvPrompt = $true }
  }
  Write-Host ""
  if (-not $SkipEnvPrompt) {
    $BaseUrl       = Read-Prompt "Public-facing URL the app will be served from" "http://localhost:$Port"
    $BlogName      = Read-Prompt "Blog display name" "OpenBlog"
    $SignUpEnabled = Read-Prompt "Allow public sign-up? (true/false)" "false"
    Write-Host ""
    $PortNew         = Read-Prompt "App host port (change if $Port is taken)" $Port
    if ($PortNew) { $Port = [int]$PortNew }
    $PgPortNew       = Read-Prompt "Postgres host port (change if $PostgresPort is taken)" $PostgresPort
    if ($PgPortNew) { $PostgresPort = [int]$PgPortNew }
    if (-not $LocalBuild) {
      $ImageNew = Read-Prompt "Image to pull" $Image
      if ($ImageNew) { $Image = $ImageNew }
    }
  }
  Write-Box "Admin account"
  $AdminEmail = Read-Prompt "Admin email" ""
  if ([string]::IsNullOrWhiteSpace($AdminEmail)) { Write-Fail "Admin email is required." }
  $AdminName = Read-Prompt "Admin display name" $AdminEmail
  if ([string]::IsNullOrWhiteSpace($AdminPassword)) {
    Write-Host ""
    $AdminPassword = Read-Secret "Admin password (min 8 chars)"
  }
  if ($AdminPassword.Length -lt 8) { Write-Fail "Admin password must be at least 8 characters." }
} else {
  if ([string]::IsNullOrWhiteSpace($BaseUrl))       { $BaseUrl = "http://localhost:$Port" }
  if ([string]::IsNullOrWhiteSpace($BlogName))      { $BlogName = "OpenBlog" }
  if ([string]::IsNullOrWhiteSpace($SignUpEnabled)) { $SignUpEnabled = "false" }
  if ([string]::IsNullOrWhiteSpace($AdminEmail))    { Write-Fail "-AdminEmail is required in non-interactive mode." }
  if ([string]::IsNullOrWhiteSpace($AdminPassword)) { Write-Fail "-AdminPassword is required in non-interactive mode." }
  if ([string]::IsNullOrWhiteSpace($AdminName))     { $AdminName = $AdminEmail }
}

# ─── Write .env ─────────────────────────────────────────────────────────────
if (-not (Test-Path ".env") -or (-not $SkipEnvPrompt)) {
  $bytes = New-Object byte[] 32
  (New-Object System.Security.Cryptography.RNGCryptoServiceProvider).GetBytes($bytes) | Out-Null
  $secret = [Convert]::ToBase64String($bytes)
  $dbBytes = New-Object byte[] 32
  (New-Object System.Security.Cryptography.RNGCryptoServiceProvider).GetBytes($dbBytes) | Out-Null
  $postgresPassword = ([BitConverter]::ToString($dbBytes)).Replace("-", "").ToLowerInvariant()
  @"
AUTH_SECRET="$secret"
POSTGRES_PASSWORD="$postgresPassword"
BASE_URL="$BaseUrl"
BLOG_NAME="$BlogName"
SIGN_UP_ENABLED="$SignUpEnabled"
APP_HOST_PORT=$Port
POSTGRES_HOST_PORT=$PostgresPort
OPENBLOG_IMAGE=$Image
"@ | Out-File -Encoding utf8 .env
  Write-Ok ".env written"
}

# ─── Up ─────────────────────────────────────────────────────────────────────
Write-Box "Starting stack"

$upArgs = @("-f", $ComposeFile, "--project-name", $ProjectName, "up", "-d")
if ($LocalBuild) { $upArgs += "--build" }

& docker compose @upArgs 2>&1 | Select-Object -Last 20
if ($LASTEXITCODE -ne 0) { Write-Fail "Failed to start the stack." }
Write-Ok "Containers created"

# ─── Wait for the app ──────────────────────────────────────────────────────
Write-Step "Waiting for the app to respond on http://localhost:$Port"
for ($i = 1; $i -le 90; $i++) {
  try {
    $r = Invoke-WebRequest -Uri "http://localhost:$Port/" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 400) { Write-Ok "App is live"; break }
  } catch {}
  if ($i -eq 90) {
    Write-Warn "App didn't respond within 90 s. Check: docker compose -f $ComposeFile --project-name $ProjectName logs -f app"
    exit 1
  }
  Start-Sleep -Seconds 1
}

# ─── Admin ─────────────────────────────────────────────────────────────────
Write-Box "Creating admin user"
& docker compose -f $ComposeFile --project-name $ProjectName exec -T app ./node_modules/.bin/tsx scripts/create-admin.ts $AdminEmail $AdminName $AdminPassword 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Fail "Admin creation failed." }
Write-Ok "Admin $script:B$AdminEmail$script:X provisioned with role $script:BADMIN$script:X"
Write-Host ""

# ─── Summary ────────────────────────────────────────────────────────────────
Clear-Host
Write-Host "$script:G$script:B╭─────────────────────────────────────────────╮$script:X"
Write-Host "$script:G$script:B│$script:X   $script:G✓$script:B  OpenBlog is live                      $script:G$script:B│$script:X"
Write-Host "$script:G$script:B╰─────────────────────────────────────────────╯$script:X"
Write-Host ""
Write-Host "  $script:B🌐$script:X  $script:C$script:Bhttp://localhost:$Port$script:X"
Write-Host "  $script:B👤$script:X  $AdminEmail"
Write-Host "  $script:B🔑$script:X  $AdminPassword"
Write-Host ""
Write-Host "  Mode:"
Write-Host "    Image:    $Image"
Write-Host "    Compose:  $ComposeFile"
Write-Host "    Project:  $ProjectName"
Write-Host ""
Write-Host "  Manage your instance:"
Write-Host "    docker compose -f $ComposeFile --project-name $ProjectName logs -f app"
Write-Host "    docker compose -f $ComposeFile --project-name $ProjectName down -v        # stop + delete data"
Write-Host ""
