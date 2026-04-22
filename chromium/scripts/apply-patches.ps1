# Applies every patch in chromium/patches/ (sorted) to chromium/src/.
# Safe to re-run: each patch is applied with `git apply --check` first.

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

if (-not (Test-Path "src")) {
    Write-Host "ERROR: chromium/src not found. Run 'npm run chromium:fetch' first." -ForegroundColor Red
    exit 1
}

$patches = Get-ChildItem -Path "patches" -Filter "*.patch" | Sort-Object Name
if ($patches.Count -eq 0) {
    Write-Host "No patches found." -ForegroundColor Yellow
    exit 0
}

Set-Location "src"

# Copy new Forgen-only files into the tree first so patches that reference
# them have something to apply against.
if (Test-Path "..\patches\_new-files") {
    Write-Host "=> Copying Forgen-only source files…" -ForegroundColor Cyan
    Copy-Item -Recurse -Force "..\patches\_new-files\*" "."
}

foreach ($p in $patches) {
    Write-Host "=> Applying $($p.Name)" -ForegroundColor Cyan
    try {
        git apply --check "..\patches\$($p.Name)"
        git apply "..\patches\$($p.Name)"
    } catch {
        Write-Host "!! Patch failed: $($p.Name). Likely needs rebasing against this Chromium version." -ForegroundColor Red
        throw
    }
}

Write-Host "=> All patches applied cleanly." -ForegroundColor Green
