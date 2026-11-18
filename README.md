# Les jeux de Yaya

Une appli Android de petits jeux pour une enfant de 3 ans : coloriage, puzzles, cris des animaux, bulles, piano, memory, compter et ombres.
L'APK pèse environ 2 Mo (dont la voix préenregistrée et les vrais cris d'animaux). L'appli marche hors ligne et ne demande aucune permission : pas d'Internet, pas de pubs.

## Installer sur la tablette

Le fichier à installer est **`LesJeuxDeYaya.apk`**, à la racine de ce dossier.

**Méthode simple (sans câble)**
1. Copie `LesJeuxDeYaya.apk` sur la tablette (clé USB, câble en mode fichiers, Google Drive…).
2. Sur la tablette, ouvre le fichier avec le gestionnaire de fichiers.
3. Android demande d'autoriser « l'installation d'applis inconnues » pour cette source : accepte, puis appuie sur **Installer**.

**Méthode par câble (adb)**
1. Sur la tablette : *Paramètres → À propos → Numéro de build*, touche-le 7 fois pour activer le mode développeur.
2. *Paramètres → Options pour les développeurs → Débogage USB* : active-le.
3. Branche la tablette au PC, puis lance :
   ```
   %LOCALAPPDATA%\Android\Sdk\platform-tools\adb install -r LesJeuxDeYaya.apk
   ```

> Si BigdroidOS a un mode enfant ou un contrôle parental, il faudra peut-être y ajouter l'appli « Les jeux de Yaya » à la main.

## Comment ça marche pour l'enfant

- **Menu** : une grosse tuile par jeu. On touche une tuile pour lancer le jeu.
- **🏠** en haut à gauche : retour au menu. Le bouton retour d'Android fait la même chose.
- **Quitter l'appli** : maintenir le petit **🔒** en bas à droite du menu pendant 3 secondes. C'est réservé aux parents, le bouton retour ne fait pas sortir de l'appli.
- **Espace parents** : maintenir le petit **⚙️** en bas à gauche du menu pendant 3 secondes (voir plus bas). Un appui trop court affiche une bulle qui rappelle quoi faire.
- Pour qu'elle ne puisse pas sortir du tout : *Paramètres → Sécurité → Épinglage d'application*.
- L'écran ne se met pas en veille tant que l'appli est ouverte.
- La voix du narrateur est une voix d'enfant préenregistrée dans l'appli. Seuls les noms donnés aux images ajoutées sont lus par la synthèse vocale de la tablette.

| Jeu | Contenu |
|---|---|
| 🎨 Coloriage | 6 dessins + une page blanche. 18 couleurs. 🪣 remplit une zone, ✏️ dessine au doigt, 🧽 gomme, 🗑️ efface tout (il faut appuyer 2 fois), 🖼️ passe au dessin suivant. |
| 🧩 Puzzles | Vraies pièces de puzzle, en 8, 16, 24 ou 35 pièces. Chaque bouton de difficulté montre une petite grille de pièces, du vert (facile) au rouge (dur). Le choix est mémorisé. Les pièces s'aimantent quand elles arrivent près de leur place. 👁️ montre le modèle 2 secondes, 🖼️ passe à l'image suivante. |
| 🐮 Animaux | 24 animaux sur 4 pages (ferme, maison et jardin, savane et jungle, forêt et mer). On touche : l'animal saute, pousse son cri (vrais enregistrements libres pour 9 animaux, voir `sounds/CREDITS.txt` ; cri synthétisé pour les autres), puis la voix dit son nom. |
| 🧼 Bulles | On éclate les bulles au doigt ou en balayant ; éclater vite joue une mélodie. Toucher le vide souffle des bulles. Mission couleur (« les bulles bleues ! », 5 à éclater), amis cachés qui remplissent l'étagère du bas, bulle géante à toucher 3 fois, bulle étoile dorée qui fait pleuvoir des étoiles. |
| 🎹 Piano | 8 touches de couleur, on peut glisser le doigt dessus. ▶️ joue « Au clair de la lune ». |
| 🃏 Memory | 2, 4, 6 ou 8 paires, au choix avec les boutons en haut (petites grilles du vert au rouge, choix mémorisé). Les cartes se montrent au début de chaque partie. |
| 🔢 Compter | Des objets apparaissent (pommes, canards…). On les touche un par un et la voix compte. Puis on choisit le bon chiffre parmi 3 cartes (chaque carte montre le chiffre et autant de points). Une mauvaise carte : la voix recompte avec l'enfant. Jusqu'à 3, 5 ou 10. |
| 🦒 Ombres | Glisser chaque animal ou objet sur son ombre (ou le toucher, puis toucher l'ombre). Il reprend ses couleurs et les animaux poussent leur cri. 2, 3 ou 4 ombres. |

## Espace parents : ajouter ses propres images

Pour y entrer, maintiens **⚙️** 3 secondes dans le menu. L'onglet **🏠 Accueil** explique chaque partie et les gestes à connaître. Il y a ensuite un onglet par jeu, chacun avec un mode d'emploi en 4 étapes :

- **🎨 Coloriages** : ajoute une page de coloriage (scan, photo bien nette, image trouvée en ligne). L'appli ne garde que les traits sombres. Règle la **sensibilité** pour que les traits soient bien continus, car une zone mal fermée se remplira avec sa voisine.
- **🧩 Puzzles** : ajoute n'importe quelle photo ou image. Les photos en hauteur marchent aussi.
- **🃏 Memory** : chaque photo devient une paire de cartes. Avec au moins 4 photos, tu peux masquer les animaux de base pour jouer uniquement avec les tiennes.

L'onglet **⚙️ Réglages** permet de **couper la voix du narrateur** (annonces, noms, félicitations ; les autres sons restent) et de **choisir les jeux affichés** dans le menu.

Dans chaque onglet d'images :
- Le **nom** que tu donnes à une image est dit par la voix (« Mamie ! »).
- Une case permet de **masquer les images de base**.
- 🗑️ supprime une image (il faut appuyer 2 fois).

Les images choisies sont réduites, puis stockées **dans l'appli, sur la tablette**. Pour une photo prise avec l'appareil photo, prends-la d'abord avec l'appli Appareil photo, puis choisis-la dans la galerie. Une mise à jour de l'appli (installer un nouvel APK par-dessus) garde les images, mais une **désinstallation les efface**.

## Modifier les jeux

Tous les jeux sont en HTML/JavaScript dans `app/src/main/assets/www/` :

```
www/
  index.html          page principale
  css/style.css       apparence
  js/core.js          menu, sons, voix, confettis
  js/store.js         stockage des images ajoutées (IndexedDB)
  js/admin.js         espace parents
  js/drawings.js      les dessins (coloriage + puzzles)
  js/games/*.js       un fichier par jeu
  voice/              phrases du narrateur préenregistrées (node tools/voices.mjs)
  sounds/             cris d'animaux (mp3) et CREDITS.txt (auteurs et licences)
```

**Tester sur le PC** (sans la tablette) :
```
node tools/serve.js
```
puis ouvre http://localhost:8123 dans Chrome. La touche Échap remplace le bouton retour.

**Recompiler l'APK** après une modification :
```
gradlew.bat assembleRelease
```
L'APK est produit dans `app/build/outputs/apk/release/app-release.apk`.

**Ajouter un jeu** : crée `js/games/monjeu.js` en copiant le modèle d'un jeu simple (`animals.js`), puis ajoute la ligne `<script>` correspondante dans `index.html`. Le jeu apparaît tout seul dans le menu.

**Changer le prénom** affiché en haut du menu : modifie `var NAME = 'Yaya';` dans `js/core.js`. Le nom sous l'icône de l'appli est dans `app/src/main/res/values/strings.xml`.

La police ronde **Fredoka** (`www/fonts/fredoka.woff2`) est sous licence SIL Open Font License : elle peut être incluse librement dans l'appli.

> L'APK est signé avec la clé de debug du PC. Pour installer une nouvelle version par-dessus l'ancienne, il faut la compiler sur ce même PC. Sinon, désinstalle d'abord l'ancienne version.
