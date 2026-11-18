/*
 * Espace parents : on y entre en maintenant ⚙️ 3 secondes dans le menu.
 * Onglet Accueil : à quoi sert chaque partie + les gestes à connaître.
 * Onglets images : ajouter / supprimer ses propres images pour le coloriage,
 * les puzzles et le memory, masquer les images de base.
 * Onglet Réglages : voix du narrateur, jeux affichés dans le menu.
 */
var Admin = (function () {
  'use strict';

  var INK = [58, 46, 90];
  var KINDS = [
    {
      kind: 'coloring', tab: '🎨 Coloriages', max: 1400, icon: '🎨',
      title: 'Ajouter des coloriages',
      pitch: 'Une photo d\'un coloriage (livre, feuille imprimée…) suffit : l\'appli en garde les traits.',
      builtin: 'Afficher aussi les 6 coloriages de base',
      help: 'Ajoute un dessin à colorier : page de coloriage scannée, photo bien nette d\'un dessin, ' +
        'image trouvée en ligne… L\'appli ne garde que les traits sombres. Règle la sensibilité pour ' +
        'que les traits soient bien continus : une zone mal fermée se remplira avec sa voisine.'
    },
    {
      kind: 'puzzle', tab: '🧩 Puzzles', max: 1280, icon: '🧩',
      title: 'Ajouter des puzzles',
      pitch: 'Tes photos (la famille, le chat, les vacances) deviennent des puzzles.',
      builtin: 'Afficher aussi les 6 images de base',
      help: 'Ajoute des photos ou des images : elles seront découpées en 8, 16, 24 ou 35 pièces. ' +
        'Le nom est dit par la voix au début du puzzle.'
    },
    {
      kind: 'memory', tab: '🃏 Memory', max: 600, ratio: 26 / 32, icon: '🃏',
      title: 'Ajouter des cartes de memory',
      pitch: 'Les visages de la famille en cartes de memory : chaque photo fait une paire.',
      builtin: 'Utiliser aussi les animaux de base',
      help: 'Chaque photo devient une paire de cartes (il en faut au moins 4 pour une partie ' +
        'sans animaux de base). Donne un nom (« Mamie », « Le chat Pipou ») : la voix le dira ' +
        'quand la paire est trouvée.'
    }
  ];

  // Onglets sans images : l'accueil et les réglages généraux
  var HOME = { tab: '🏠 Accueil', panel: 'home' };
  var SETTINGS = { tab: '⚙️ Réglages', panel: 'settings', icon: '⚙️', title: 'Réglages',
    pitch: 'Couper la voix du narrateur, choisir les jeux affichés dans le menu.' };
  var TABS = [HOME].concat(KINDS, [SETTINGS]);

  var h = App.h;
  var root, tabsEl, toggle, toggleText, helpEl, stepsEl, titleEl, grid, emptyEl, fileInput, editor;
  var imagesPanel, settingsPanel, homePanel;
  var cur = HOME, isOpen = false;

  // Une case à cocher avec un texte et une explication, liée à un réglage
  function settingRow(parent, key, label, help) {
    var lab = h('label', 'admin-toggle', parent);
    var box = h('input', null, lab);
    box.type = 'checkbox';
    box.checked = Store.getSetting(key, true);
    h('span', null, lab, label);
    box.addEventListener('change', function () { Store.setSetting(key, box.checked); });
    h('p', 'admin-help', parent, help);
  }

  function build() {
    root = h('div', 'screen admin hidden', document.body);
    var head = h('div', 'admin-head', root);
    h('h2', null, head, 'Espace parents');
    var close = h('button', 'admin-btn', head, '✕ Retour aux jeux');
    close.addEventListener('click', closeAdmin);

    tabsEl = h('div', 'admin-tabs', root);
    TABS.forEach(function (k) {
      var b = h('button', 'admin-tab', tabsEl, k.tab);
      b.addEventListener('click', function () { cur = k; refresh(); });
      k.btn = b;
    });

    var body = h('div', 'admin-body', root);

    homePanel = h('div', null, body);
    buildHome(homePanel);

    settingsPanel = h('div', null, body);
    h('h3', 'admin-title', settingsPanel, 'Son');
    settingRow(settingsPanel, 'voice', 'Voix du narrateur',
      'La voix qui annonce les jeux, dit le nom des animaux et des images, et félicite. ' +
      'Si tu la coupes, tous les autres sons restent : notes du piano, cris des animaux, ' +
      'bulles, petites musiques de victoire.');
    buildVoiceHelp(settingsPanel);
    h('h3', 'admin-title', settingsPanel, 'Jeux affichés dans le menu');
    h('p', 'admin-help', settingsPanel, 'Décoche un jeu pour le cacher (par exemple s\'il est encore trop ' +
      'difficile). Il reste toujours au moins un jeu. Le changement se voit en revenant aux jeux.');
    var gl = h('div', 'admin-games', settingsPanel);
    App.games().forEach(function (def) {
      var lab = h('label', 'admin-game', gl);
      var box = h('input', null, lab);
      box.type = 'checkbox';
      box.checked = Store.getSetting('game.' + def.id, true);
      h('span', 'ic', lab, def.icon);
      h('span', null, lab, def.name);
      box.addEventListener('change', function () {
        var others = App.games().filter(function (g) { return g !== def && Store.getSetting('game.' + g.id, true); });
        if (!box.checked && !others.length) { box.checked = true; return; } // jamais aucun jeu
        Store.setSetting('game.' + def.id, box.checked);
      });
    });

    imagesPanel = h('div', null, body);
    titleEl = h('h3', 'admin-title', imagesPanel);
    h('p', 'admin-steps-title', imagesPanel, 'Comment faire :');
    stepsEl = h('ol', 'admin-steps', imagesPanel);
    ['Touche « Ajouter une image » (la case avec le ＋).',
      'Choisis une photo ou une image dans la tablette.',
      'Donne-lui un nom : la voix le dira pendant le jeu.',
      'Touche « Enregistrer ». C\'est tout !'].forEach(function (t) { h('li', null, stepsEl, t); });
    var lab = h('label', 'admin-toggle', imagesPanel);
    toggle = h('input', null, lab);
    toggle.type = 'checkbox';
    toggleText = h('span', null, lab);
    toggle.addEventListener('change', function () {
      Store.setSetting('builtin.' + cur.kind, toggle.checked);
    });
    helpEl = h('p', 'admin-help', imagesPanel);
    grid = h('div', 'admin-grid', imagesPanel);
    emptyEl = h('p', 'admin-empty', imagesPanel, 'Aucune image ajoutée pour l\'instant.');

    fileInput = h('input', null, root);
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', function () {
      var f = fileInput.files && fileInput.files[0];
      fileInput.value = '';
      if (f) openEditor(f);
    });
  }

  // La voix vient du moteur de synthèse vocale de la tablette : on aide à en choisir un joli
  function buildVoiceHelp(parent) {
    var bridge = window.AndroidBridge;
    var engine = bridge && bridge.voiceEngine ? String(bridge.voiceEngine()) : '';
    var broken = engine.charAt(0) === '!';
    engine = engine.replace('!', '');
    var google = engine.indexOf('com.google.android.tts') === 0;
    var box = h('div', 'admin-voice', parent);
    var test = h('button', 'admin-btn', box, '▶️ Écouter la voix');
    test.addEventListener('click', function () { App.say('Coucou Yaya ! On va bien s\'amuser !'); });
    if (bridge && bridge.openVoiceSettings) {
      var open = h('button', 'admin-btn', box, '🔧 Réglages de la voix (Android)');
      open.addEventListener('click', function () { bridge.openVoiceSettings(); });
    }
    var msg = 'Toutes les phrases des jeux sont enregistrées dans l\'appli avec une voix d\'enfant douce. ' +
      'Seuls les noms que tu donnes à tes images sont lus par la voix de la tablette. ';
    if (bridge && !google) {
      msg += (broken ? 'Aucune voix française n\'est prête sur la tablette : ces noms ne seront pas dits. ' :
        'Cette voix-là est assez robotique. ') +
        'Pour l\'améliorer : installe « Services vocaux Google » (Speech Services by Google) depuis le Play Store, ' +
        'puis dans « Réglages de la voix », choisis-le comme moteur.';
    }
    h('p', 'admin-help', parent, msg);
  }

  // Page d'accueil : une carte par partie (on la touche pour y aller) + les gestes utiles
  function buildHome(parent) {
    h('h3', 'admin-title', parent, 'Bienvenue dans l\'espace parents 👋');
    h('p', 'admin-help', parent, 'Ici, tu peux ajouter tes propres images dans les jeux et régler l\'appli. ' +
      'Touche une carte pour commencer.');
    var cards = h('div', 'admin-cards', parent);
    KINDS.concat([SETTINGS]).forEach(function (k) {
      var c = h('button', 'admin-card', cards);
      h('div', 'ic', c, k.icon);
      var tx = h('div', 'tx', c);
      h('strong', null, tx, k.title);
      h('span', null, tx, k.pitch);
      if (k.kind) k.countEl = h('em', null, tx);
      c.addEventListener('click', function () { cur = k; refresh(); });
    });
    h('h3', 'admin-title', parent, 'Bon à savoir');
    var ul = h('ul', 'admin-tips', parent);
    [
      ['⚙️', 'Pour revenir ici : dans le menu des jeux, garde le doigt appuyé 3 secondes sur ⚙️ (en bas à gauche).'],
      ['🔒', 'Pour quitter l\'appli : garde le doigt appuyé 3 secondes sur 🔒 (en bas à droite).'],
      ['🏠', 'Dans chaque jeu, la maison en haut à gauche ramène au menu.'],
      ['🔊', 'Les noms de tes images sont lus par la voix de la tablette : si elle est robotique, va dans Réglages.'],
      ['🟩', 'La difficulté se choisit en haut à droite des jeux : vert = facile, rouge = difficile. ' +
        'L\'appli retient le dernier choix.'],
      ['📌', 'Pour que l\'enfant ne sorte pas de l\'appli par erreur, active l\'épinglage d\'écran ' +
        'dans les paramètres Android (Sécurité › Épinglage d\'application).'],
      ['💾', 'Tes images restent sur la tablette : rien n\'est envoyé sur Internet. ' +
        'Si tu désinstalles l\'appli, elles sont effacées.']
    ].forEach(function (t) {
      var li = h('li', null, ul);
      h('span', 'ic', li, t[0]);
      h('span', null, li, t[1]);
    });
  }

  function refreshCounts() {
    KINDS.forEach(function (k) {
      Store.list(k.kind).then(function (items) {
        var n = items.length;
        k.countEl.textContent = n ? n + (n > 1 ? ' images ajoutées' : ' image ajoutée') : 'Aucune image ajoutée';
      });
    });
  }

  function refresh() {
    TABS.forEach(function (k) { k.btn.classList.toggle('on', k === cur); });
    homePanel.classList.toggle('hidden', cur !== HOME);
    settingsPanel.classList.toggle('hidden', cur !== SETTINGS);
    imagesPanel.classList.toggle('hidden', !cur.kind);
    if (cur === HOME) refreshCounts();
    if (!cur.kind) return;
    titleEl.textContent = cur.title;
    toggle.checked = Store.showBuiltins(cur.kind);
    toggleText.textContent = cur.builtin;
    helpEl.textContent = cur.help;
    grid.innerHTML = '';

    var add = h('button', 'admin-item admin-add', grid);
    h('div', 'plus', add, '＋');
    h('div', 'name', add, 'Ajouter une image');
    add.addEventListener('click', function () { fileInput.click(); });

    var kind = cur.kind;
    emptyEl.classList.add('hidden');
    Store.list(kind).then(function (items) {
      if (kind !== cur.kind) return;
      emptyEl.classList.toggle('hidden', items.length > 0);
      items.forEach(function (it) {
        var card = h('div', 'admin-item', grid);
        var img = h('img', null, card);
        img.src = it.thumb || it.data;
        h('div', 'name', card, it.name || 'Sans nom');
        var del = h('button', 'del', card, '🗑️');
        var armed = false;
        del.addEventListener('click', function () {
          if (!armed) { // deux appuis pour supprimer
            armed = true;
            del.textContent = 'Supprimer ?';
            del.classList.add('armed');
            setTimeout(function () {
              armed = false;
              del.textContent = '🗑️';
              del.classList.remove('armed');
            }, 3000);
            return;
          }
          Store.remove(it.id).then(refresh);
        });
      });
    });
  }

  // ------------------------------------------------------------ Traitement des images
  function canvasOf(w, hh) {
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(hh));
    return c;
  }

  // Réduit l'image (fond blanc pour les PNG transparents), recadre si besoin
  function prepare(img, max, ratio) {
    var sx = 0, sy = 0, sw = img.width, sh = img.height;
    if (ratio) { // recadrage centré au format des cartes
      if (sw / sh > ratio) { sw = sh * ratio; sx = (img.width - sw) / 2; } else { sh = sw / ratio; sy = (img.height - sh) / 2; }
    }
    var k = Math.min(1, max / Math.max(sw, sh));
    var c = canvasOf(sw * k, sh * k);
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
    return c;
  }

  // Ne garde que les traits sombres : couleur d'encre + transparence
  function toLineArt(src, threshold) {
    var w = src.width, hh = src.height;
    var d = src.getContext('2d').getImageData(0, 0, w, hh);
    var out = canvasOf(w, hh);
    var octx = out.getContext('2d');
    var o = octx.createImageData(w, hh);
    var a = d.data, b = o.data;
    for (var i = 0; i < a.length; i += 4) {
      var lum = 0.299 * a[i] + 0.587 * a[i + 1] + 0.114 * a[i + 2];
      var alpha = (threshold - lum) * 5;
      b[i] = INK[0]; b[i + 1] = INK[1]; b[i + 2] = INK[2];
      b[i + 3] = alpha < 0 ? 0 : alpha > 255 ? 255 : alpha;
    }
    octx.putImageData(o, 0, 0);
    return out;
  }

  function thumbOf(c) {
    var k = Math.min(1, 240 / Math.max(c.width, c.height));
    var t = canvasOf(c.width * k, c.height * k);
    var ctx = t.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, t.width, t.height);
    ctx.drawImage(c, 0, 0, t.width, t.height);
    return t.toDataURL('image/jpeg', 0.8);
  }

  // ------------------------------------------------------------ Éditeur d'ajout
  function openEditor(file) {
    var kind = cur;
    var url = URL.createObjectURL(file);
    Store.loadImage(url).then(function (img) {
      URL.revokeObjectURL(url);
      var base = prepare(img, kind.max, kind.ratio);
      var line = null;

      editor = h('div', 'admin-editor', root);
      var box = h('div', 'box', editor);
      var view = h('div', 'view', box);
      var preview = h('canvas', null, view);
      var form = h('div', 'form', box);

      h('label', null, form, 'Nom (dit par la voix)');
      var name = h('input', 'admin-input', form);
      name.type = 'text';
      name.placeholder = kind.kind === 'memory' ? 'ex : Mamie' : 'ex : La licorne';
      name.value = file.name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').slice(0, 40);

      var slider = null;
      if (kind.kind === 'coloring') {
        h('label', null, form, 'Sensibilité des traits');
        slider = h('input', 'admin-range', form);
        slider.type = 'range';
        slider.min = 40;
        slider.max = 235;
        slider.value = 150;
        h('p', 'admin-hint', form, 'Plus à droite = plus de traits gardés (et traits plus épais).');
      }

      function draw() {
        preview.width = base.width;
        preview.height = base.height;
        var ctx = preview.getContext('2d');
        if (slider) {
          line = toLineArt(base, +slider.value);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, base.width, base.height);
          ctx.drawImage(line, 0, 0);
        } else {
          ctx.drawImage(base, 0, 0);
        }
      }
      if (slider) {
        var t = 0;
        slider.addEventListener('input', function () {
          clearTimeout(t);
          t = setTimeout(draw, 60);
        });
      }
      draw();

      var btns = h('div', 'buttons', form);
      var cancel = h('button', 'admin-btn', btns, 'Annuler');
      var save = h('button', 'admin-btn primary', btns, 'Enregistrer');
      cancel.addEventListener('click', closeEditor);
      save.addEventListener('click', function () {
        save.disabled = true;
        save.textContent = 'Enregistrement…';
        var item = { kind: kind.kind, name: name.value.trim() };
        if (slider) {
          item.data = line.toDataURL('image/png');
          item.thumb = thumbOf(preview);
        } else {
          item.data = base.toDataURL('image/jpeg', 0.85);
          item.thumb = thumbOf(base);
        }
        Store.add(item).then(function () {
          closeEditor();
          refresh();
        }, function () {
          save.disabled = false;
          save.textContent = 'Erreur, réessayer';
        });
      });
    }, function () {
      URL.revokeObjectURL(url);
      alert('Impossible de lire cette image.');
    });
  }

  function closeEditor() {
    if (editor) editor.remove();
    editor = null;
  }

  // ------------------------------------------------------------ Ouverture / fermeture
  function openAdmin() {
    if (!root) build();
    cur = HOME;
    isOpen = true;
    document.getElementById('menu').classList.add('hidden');
    root.classList.remove('hidden');
    refresh();
  }

  function closeAdmin() {
    closeEditor();
    isOpen = false;
    root.classList.add('hidden');
    App.refreshMenu();
    document.getElementById('menu').classList.remove('hidden');
  }

  return {
    open: openAdmin,
    close: closeAdmin,
    isOpen: function () { return isOpen; }
  };
})();
