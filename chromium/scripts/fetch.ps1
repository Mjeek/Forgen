# Fetches Chromium source + depot_tools. Run once.
# Requires: git, python 3.11+, ~40 GB free disk, ~1 hour on good bandwidth.

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

if (-not (Test-Path "depot_tools")) {
    Write-Host "=> Cloning depot_tools…" -ForegroundColor Cyan
    git clone https://chromium.googlesource.com/chromium/tools/depot_tools.git depot_tools
}

$env:PATH = "$PSScriptRoot\..\depot_tools;$env:PATH"
$env:DEPOT_TOOLS_WIN_TOOLCHAIN = "0"

if (-not (Test-Path "src")) {
    Write-Host "=> Fetching Chromium (this will take a while)…" -ForegroundColor Cyan
    New-Item -ItemType Directory -Path "src" | Out-Null
    Set-Location "src"
    fetch --nohooks --no-history chromium
    Set-Location ..
}

Write-Host "=> Checking out pinned branch…" -ForegroundColor Cyan
$branch = (Get-Content -Raw "CHROMIUM_VERSION.txt").Trim()
Set-Location "src"
git fetch origin $branch
git checkout $branch

Write-Host "=> Running gclient sync…" -ForegroundColor Cyan
gclient sync -D

Write-Host "=> Done. Next: npm run chromium:patch" -ForegroundColor Green
