/*
 * Espace parents : on y entre en maintenant ⚙️ 3 secondes dans le menu.
 * Permet d'ajouter / supprimer ses propres images pour le coloriage,
 * les puzzles et le memory, de masquer les images de base, et de couper
 * la voix du narrateur (onglet Réglages).
 */
var Admin = (function () {
  'use strict';

  var INK = [58, 46, 90];
  var KINDS = [
    {
      kind: 'coloring', tab: '🎨 Coloriages', max: 1400,
      builtin: 'Afficher aussi les 6 coloriages de base',
      help: 'Ajoute un dessin à colorier : page de coloriage scannée, photo bien nette d\'un dessin, ' +
        'image trouvée en ligne… L\'appli ne garde que les traits sombres. Règle la sensibilité pour ' +
        'que les traits soient bien continus : une zone mal fermée se remplira avec sa voisine.'
    },
    {
      kind: 'puzzle', tab: '🧩 Puzzles', max: 1280,
      builtin: 'Afficher aussi les 6 images de base',
      help: 'Ajoute des photos ou des images : elles seront découpées en 8, 16, 24 ou 35 pièces. ' +
        'Le nom est dit par la voix au début du puzzle.'
    },
    {
      kind: 'memory', tab: '🃏 Memory', max: 600, ratio: 26 / 32,
      builtin: 'Utiliser aussi les animaux de base',
      help: 'Chaque photo devient une paire de cartes (il en faut au moins 4 pour une partie ' +
        'sans animaux de base). Donne un nom (« Mamie », « Le chat Pipou ») : la voix le dira ' +
        'quand la paire est trouvée.'
    }
  ];

  // Onglet des réglages généraux (pas d'images)
  var SETTINGS = { tab: '🔊 Réglages', settings: true };
  var TABS = KINDS.concat([SETTINGS]);

  var h = App.h;
  var root, tabsEl, toggle, toggleText, helpEl, grid, fileInput, editor;
  var imagesPanel, settingsPanel;
  var cur = KINDS[0], isOpen = false;

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
    var close = h('button', 'admin-btn', head, '✕ Fermer');
    close.addEventListener('click', closeAdmin);

    tabsEl = h('div', 'admin-tabs', root);
    TABS.forEach(function (k) {
      var b = h('button', 'admin-tab', tabsEl, k.tab);
      b.addEventListener('click', function () { cur = k; refresh(); });
      k.btn = b;
    });

    var body = h('div', 'admin-body', root);

    settingsPanel = h('div', null, body);
    settingRow(settingsPanel, 'voice', 'Voix du narrateur',
      'La voix qui annonce les jeux, dit le nom des animaux et des images, et félicite. ' +
      'Si tu la coupes, tous les autres sons restent : notes du piano, cris des animaux, ' +
      'bulles, petites musiques de victoire.');

    imagesPanel = h('div', null, body);
    var lab = h('label', 'admin-toggle', imagesPanel);
    toggle = h('input', null, lab);
    toggle.type = 'checkbox';
    toggleText = h('span', null, lab);
    toggle.addEventListener('change', function () {
      Store.setSetting('builtin.' + cur.kind, toggle.checked);
    });
    helpEl = h('p', 'admin-help', imagesPanel);
    grid = h('div', 'admin-grid', imagesPanel);

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

  function refresh() {
    TABS.forEach(function (k) { k.btn.classList.toggle('on', k === cur); });
    settingsPanel.classList.toggle('hidden', !cur.settings);
    imagesPanel.classList.toggle('hidden', !!cur.settings);
    if (cur.settings) return;
    toggle.checked = Store.showBuiltins(cur.kind);
    toggleText.textContent = cur.builtin;
    helpEl.textContent = cur.help;
    grid.innerHTML = '';

    var add = h('button', 'admin-item admin-add', grid);
    h('div', 'plus', add, '＋');
    h('div', 'name', add, 'Ajouter une image');
    add.addEventListener('click', function () { fileInput.click(); });

    var kind = cur.kind;
    Store.list(kind).then(function (items) {
      if (kind !== cur.kind) return;
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
    isOpen = true;
    document.getElementById('menu').classList.add('hidden');
    root.classList.remove('hidden');
    refresh();
  }

  function closeAdmin() {
    closeEditor();
    isOpen = false;
    root.classList.add('hidden');
    document.getElementById('menu').classList.remove('hidden');
  }

  return {
    open: openAdmin,
    close: closeAdmin,
    isOpen: function () { return isOpen; }
  };
})();
