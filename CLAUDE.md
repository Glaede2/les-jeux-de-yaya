# Les jeux de Yaya

Appli Android (APK) de petits jeux pour une enfant de 3 ans, sur une tablette faible (TK707, Android 12 32 bits).
Jeux en HTML/JS dans une WebView (`app/src/main/assets/www/`), coquille Java minimale (`MainActivity.java`).

## Règles du projet
- Tout reste léger : pas de framework, pas de dépendance npm/Gradle en plus, sprites pré-dessinés, pas de boucle d'animation inutile.
- WebView d'Android 12 : éviter les API JS/CSS trop récentes (pas de `roundRect`, `:has`, `Array.at`…), et les emojis plus récents qu'Emoji 13.1.
- L'enfant ne lit pas : aucun chiffre ni texte nécessaire pour jouer, jamais d'échec ni de chrono.
- Cris d'animaux : vrais enregistrements en mp3 courts dans `www/sounds/`, uniquement sous licence libre (domaine public, CC0, CC BY, CC BY-SA), chacun crédité dans `www/sounds/CREDITS.txt`. Jamais de cri synthétisé : un animal sans vrai enregistrement n'est pas dans le jeu.
- Voix du narrateur : chaque phrase dite par `App.say` doit être déclarée avec `App.lines([...])` dans son jeu, puis préenregistrée avec `node tools/voices.mjs` (serveur lancé ; voix d'enfant fr-FR-EloiseNeural via edge-tts ; ffmpeg via la variable FFMPEG, ici `C:\Program Files\Lian-Li\L-Connect 3\x64\ffmpeg.exe`). Une phrase non enregistrée passe par la voix robotique de la tablette.
- Tester dans le navigateur (`node tools/serve.js` puis http://localhost:8123, `#puzzle` ouvre un jeu directement) avant de compiler.

## Publier une nouvelle version (à faire à chaque changement de l'appli)
Les APK sont publiés dans les releases GitHub de https://github.com/Glaede2/les-jeux-de-yaya.
```
.\tools\release.ps1 1.2.0 "Ce qui change"
```
Le script monte la version, compile, commit, tag, push, et crée la release avec l'asset `LesJeuxDeYaya.apk`.
Ne jamais renommer cet asset : le site télécharge `.../releases/latest/download/LesJeuxDeYaya.apk`.

## Site de téléchargement : https://yaya.glaede.fr
- Sources dans `site/` (statique). Captures des jeux régénérées par `node tools/screenshots.mjs` (avec `node tools/serve.js` lancé).
- Test local : `node tools/serve.js site 8124`. Mise en ligne : `.\tools\deploy-site.ps1`.
- VPS `ubuntu@51.178.139.69` : fichiers dans `/home/ubuntu/yaya/public`, servis par Caddy (bloc `yaya.glaede.fr` en `file_server`, pas de service systemd).
  Ne jamais toucher aux autres projets du VPS (checker, untamed, photos, salesmap). Sauvegarder dans `~/backups/` avant de modifier un fichier existant.
