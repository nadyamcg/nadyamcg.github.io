<# refresh_canary.ps1 — SSH-only canary updater (Windows PowerShell) #>
$ErrorActionPreference = "Stop"
function Get-OriginUrl { (git remote get-url origin).Trim() }
$origin = Get-OriginUrl
if ($origin -like "https://*") {
  Write-Error "origin is HTTPS; this tool only pushes over SSH.`n`nhint: git remote set-url origin git@github.com:<USER>/<REPO>.git"
}
$Path = "canary/canary.json"
if (-not (Test-Path $Path)) { Write-Error "$Path not found. run from repo root." }
$json = Get-Content $Path -Raw | ConvertFrom-Json
if (-not $json.window_days) { $json | Add-Member -NotePropertyName window_days -NotePropertyValue 14 }
$utc = [DateTime]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ")
$json.last_update = $utc
$alphabet = "abcdefghijklmnopqrstuvwxyz0123456789"
$rand = -join ((1..16) | ForEach-Object { $alphabet[(Get-Random -Min 0 -Max $alphabet.Length)] })
$json.token = $rand
$json | ConvertTo-Json -Depth 5 | Out-File $Path -Encoding utf8
git add $Path
$branch = (git rev-parse --abbrev-ref HEAD).Trim()
$commit = "canary: refresh $utc token $rand"
git commit -m $commit
git push origin $branch
Write-Host "ok ✓ pushed over SSH"
