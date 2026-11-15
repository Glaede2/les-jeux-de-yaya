# Publie une nouvelle version de l'appli sur GitHub.
#   .\tools\release.ps1 1.1.0 "Ce qui change dans cette version"
# 1. met à jour la version (versionName + versionCode + 1) dans app/build.gradle
# 2. compile l'APK signé
# 3. commit + tag vX.Y.Z + push
# 4. crée la release GitHub avec l'APK nommé LesJeuxDeYaya.apk
#    (le site pointe sur .../releases/latest/download/LesJeuxDeYaya.apk : ce nom ne doit pas changer)
param(
    [Parameter(Mandatory = $true)][string]$Version,
    [Parameter(Mandatory = $true)][string]$Notes
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

if ($Version -notmatch '^\d+\.\d+\.\d+$') { throw "Version attendue au format 1.2.3" }
if (git tag --list "v$Version") { throw "La version v$Version existe déjà" }

# Version dans app/build.gradle
$gradle = Get-Content app\build.gradle -Raw
$code = [int]([regex]::Match($gradle, 'versionCode (\d+)').Groups[1].Value) + 1
$gradle = $gradle -replace 'versionCode \d+', "versionCode $code" -replace "versionName '[^']*'", "versionName '$Version'"
[IO.File]::WriteAllText("$root\app\build.gradle", $gradle)

# Compilation
.\gradlew.bat assembleRelease --console=plain -q
if ($LASTEXITCODE -ne 0) { throw "La compilation a échoué" }
Copy-Item app\build\outputs\apk\release\app-release.apk .\LesJeuxDeYaya.apk -Force

# Git + release
git add -A
git commit -m "Version $Version" -m $Notes
git tag "v$Version"
git push origin main --tags
gh release create "v$Version" ".\LesJeuxDeYaya.apk" --title "Version $Version" --notes $Notes
Write-Host "Publié : https://github.com/Glaede2/les-jeux-de-yaya/releases/tag/v$Version"
