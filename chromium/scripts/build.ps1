# Builds the patched Chromium to chromium/out/Release/chrome.exe.
# First build: 2–8 hours. Incremental: 10–60 min.

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$env:PATH = "$PSScriptRoot\..\depot_tools;$env:PATH"
$env:DEPOT_TOOLS_WIN_TOOLCHAIN = "0"

if (-not (Test-Path "src")) {
    Write-Host "ERROR: chromium/src not found. Run 'npm run chromium:fetch' first." -ForegroundColor Red
    exit 1
}

Set-Location "src"

$out = "..\out\Release"
if (-not (Test-Path $out)) {
    Write-Host "=> Generating build files with gn…" -ForegroundColor Cyan
    $gnArgs = @(
        'is_official_build=true',
        'is_debug=false',
        'symbol_level=0',
        'blink_symbol_level=0',
        'enable_nacl=false',
        'chrome_pgo_phase=0',
        'is_component_build=false',
        'use_remoteexec=false',
        'dcheck_always_on=false',
        'treat_warnings_as_errors=false'
    )
    gn gen $out "--args=$($gnArgs -join ' ')"
}

Write-Host "=> Building chrome (this will take a while)…" -ForegroundColor Cyan
autoninja -C $out chrome

Write-Host "=> Build complete. Binary at chromium\out\Release\chrome.exe" -ForegroundColor Green
