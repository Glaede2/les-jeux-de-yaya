# Envoie le site de téléchargement (dossier site/) sur le VPS : https://yaya.glaede.fr
#   .\tools\deploy-site.ps1
# Les fichiers partent dans ~/yaya/public.new, puis on bascule d'un coup (pas de site à moitié copié).
# Caddy sert ~/yaya/public directement : pas de service à redémarrer.
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$vps = 'ubuntu@51.178.139.69'

ssh $vps 'rm -rf ~/yaya/public.new && mkdir -p ~/yaya/public.new'
scp -r -q "$root\site\*" "${vps}:~/yaya/public.new/"
if ($LASTEXITCODE -ne 0) { throw "Envoi scp échoué" }
ssh $vps 'cd ~/yaya && rm -rf public.old && { [ -d public ] && mv public public.old || true; } && mv public.new public && rm -rf public.old && chmod -R a+rX public'
Write-Host "Site en ligne : https://yaya.glaede.fr"
