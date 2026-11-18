/*
 * Coloriage : on choisit une couleur, on touche une zone, elle se remplit
 * (avec une petite vague qui part du doigt). Mode crayon pour dessiner librement,
 * gomme pour effacer.
 *
 * Le pot de peinture travaille sur les pixels : les traits noirs du dessin forment
 * des murs, et on remplit tout ce qui est enfermé entre eux. Ça marche donc aussi
 * avec les dessins ajoutés par les parents (photos ou scans de coloriages).
 * Les traits restent toujours affichés par-dessus la peinture.
 */
(function () {
  'use strict';

  // 18 couleurs, rangées par 3 dans la palette
  var COLORS = [
    '#ff4d4d', '#ff9f1c', '#ffe14d',
    '#ffd6a5', '#8ac926', '#2d6a4f',
    '#4cc9f0', '#3a86ff', '#1d3557',
    '#cdb4db', '#9b5de5', '#ff70a6',
    '#ffc8dd', '#c68b59', '#8d5524',
    '#adb5bd', '#3a2e5a', '#ffffff'];
  var MAX = 1200; // taille max du dessin en pixels (mémoire et vitesse)

  function newCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  function hexToRgb(hex) {
    var n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  // Liste des pages : dessins de base (si activés), ceux des parents, puis la page blanche
  function buildPages(items) {
    var pages = [];
    if (Store.showBuiltins('coloring') || !items.length) {
      Drawings.pages.forEach(function (d) {
        pages.push({ name: d.name, aspect: Drawings.W / Drawings.H, make: function (w, h) { return Drawings.lineArt(d, w, h); } });
      });
    }
    items.forEach(function (it) {
      pages.push({ name: it.name || 'Mon dessin', src: it.data });
    });
    pages.push({ name: 'Dessin libre', aspect: 4 / 3, blank: true, make: newCanvas });
    return pages;
  }

  App.lines(['Coloriage ! Choisis une couleur.', 'Dessin libre'].concat(Drawings.pages.map(function (d) { return d.name; })));

  App.register({
    id: 'coloring',
    name: 'Coloriage',
    icon: '🎨',
    color: '#ff8fab',
    start: function (kit) {
      var h = App.h;
      var wrap = h('div', 'coloring', kit.root);
      var stage = h('div', 'stage', wrap);
      var canvas = h('canvas', null, stage);
      var side = h('div', 'side', wrap);
      var palette = h('div', 'palette', side);
      var tools = h('div', 'tools', wrap);
      var ctx = canvas.getContext('2d');

      var pages = [], pageIdx = 0, page = null;
      var color = COLORS[0], mode = 'pen'; // le crayon est l'outil par défaut
      var size, rect, sc;             // zone du dessin dans le canvas affiché
      var bw = 0, bh = 0;             // taille du dessin en pixels de travail
      var line, paint, pctx, fillLayer, fctx;
      var barrier, region;            // murs (traits) et zone en cours de remplissage
      var anim = null;

      // ---- Palette
      var swatches = COLORS.map(function (c, i) {
        var b = h('button', 'swatch' + (i === 0 ? ' on' : ''), palette);
        b.style.background = c;
        kit.on(b, 'pointerdown', function () {
          color = c;
          swatches.forEach(function (x) { x.classList.remove('on'); });
          b.classList.add('on');
          App.Sfx.tone(500 + i * 25, 0.08, { type: 'triangle', vol: 0.15 });
          if (mode === 'eraser') setMode(lastMode); // choisir une couleur quitte la gomme
        });
        return b;
      });

      // ---- Outils : pot, crayon et gomme groupés ; effacer tout et dessin suivant à part
      var group = h('div', 'toolgroup', tools);
      var bFill = h('button', 'round-btn', group, '🪣');
      var bPen = h('button', 'round-btn on', group, '✏️');
      var bEraser = h('button', 'round-btn', group, '🧽');
      h('div', 'spacer', tools);
      var bClear = h('button', 'round-btn', tools, '🗑️');
      var bNext = h('button', 'round-btn', tools, '🖼️');
      var lastMode = 'pen';

      function setMode(m) {
        mode = m;
        if (m !== 'eraser') lastMode = m;
        bFill.classList.toggle('on', m === 'fill');
        bPen.classList.toggle('on', m === 'pen');
        bEraser.classList.toggle('on', m === 'eraser');
        App.Sfx.tap();
      }
      kit.on(bFill, 'pointerdown', function () { setMode('fill'); });
      kit.on(bPen, 'pointerdown', function () { setMode('pen'); });
      kit.on(bEraser, 'pointerdown', function () { setMode('eraser'); });

      // Effacer : il faut appuyer deux fois (évite les accidents)
      var clearArmed = false;
      kit.on(bClear, 'pointerdown', function () {
        if (!paint) return;
        if (!clearArmed) {
          clearArmed = true;
          bClear.classList.add('on');
          App.bounce(bClear);
          App.Sfx.tap();
          kit.later(function () { clearArmed = false; bClear.classList.remove('on'); }, 2000);
          return;
        }
        clearArmed = false;
        bClear.classList.remove('on');
        App.Sfx.tone(900, 0.3, { slide: 200, vol: 0.2 });
        anim = null;
        pctx.fillStyle = '#ffffff';
        pctx.fillRect(0, 0, bw, bh);
        render();
      });

      kit.on(bNext, 'pointerdown', function () {
        if (!pages.length) return;
        App.bounce(bNext);
        loadPage((pageIdx + 1) % pages.length);
      });

      // ---- Changement de dessin
      function loadPage(i, quiet) {
        pageIdx = i;
        var p = pages[i];
        if (!quiet) {
          App.Sfx.flip();
          App.say(p.name);
        }
        if (p.blank) setMode('pen');
        if (p.make) { page = p; setup(false); return; }
        // dessin des parents : on charge l'image la première fois
        Store.loadImage(p.src).then(function (img) {
          p.aspect = img.width / img.height;
          p.make = function (w, hh) {
            var c = newCanvas(w, hh);
            c.getContext('2d').drawImage(img, 0, 0, w, hh);
            return c;
          };
          if (kit.alive() && pageIdx === i) { page = p; setup(false); }
        });
      }

      // ---- Préparation : traits, murs, couche de peinture
      function setup(keepPaint) {
        if (!page) return;
        size = App.fitCanvas(canvas);
        var cw = canvas.width, ch = canvas.height;
        var rw = Math.min(cw, ch * page.aspect), rh = rw / page.aspect;
        rect = { x: (cw - rw) / 2, y: (ch - rh) / 2, w: rw, h: rh };
        var k = Math.min(1, MAX / Math.max(rw, rh));
        var oldPaint = keepPaint ? paint : null;
        bw = Math.max(1, Math.round(rw * k));
        bh = Math.max(1, Math.round(rh * k));
        sc = rw / bw;

        line = page.make(bw, bh);
        var d = line.getContext('2d').getImageData(0, 0, bw, bh).data;
        var raw = new Uint8Array(bw * bh);
        for (var i = 0, n = bw * bh; i < n; i++) raw[i] = d[i * 4 + 3] > 90 ? 1 : 0;
        // Murs épaissis d'1 pixel : bouche les petits trous dans les traits
        barrier = new Uint8Array(bw * bh);
        for (var y = 0; y < bh; y++) {
          for (var x = 0; x < bw; x++) {
            var j = y * bw + x;
            barrier[j] = raw[j] || (x > 0 && raw[j - 1]) || (x < bw - 1 && raw[j + 1]) ||
              (y > 0 && raw[j - bw]) || (y < bh - 1 && raw[j + bw]) ? 1 : 0;
          }
        }
        region = new Uint8Array(bw * bh);

        paint = newCanvas(bw, bh);
        pctx = paint.getContext('2d');
        pctx.fillStyle = '#ffffff';
        pctx.fillRect(0, 0, bw, bh);
        if (oldPaint) pctx.drawImage(oldPaint, 0, 0, bw, bh);
        fillLayer = newCanvas(bw, bh);
        fctx = fillLayer.getContext('2d');
        anim = null;
        render();
      }

      function render() {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (!paint) return;
        ctx.drawImage(paint, rect.x, rect.y, rect.w, rect.h);
        if (anim) { // la nouvelle couleur s'étale en cercle depuis le doigt
          ctx.save();
          ctx.beginPath();
          ctx.arc(rect.x + anim.x * sc, rect.y + anim.y * sc, anim.r * sc, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(fillLayer, rect.x, rect.y, rect.w, rect.h);
          ctx.restore();
        }
        ctx.drawImage(line, rect.x, rect.y, rect.w, rect.h);
      }

      // ---- Pot de peinture
      // Point de départ : si on a touché un trait, on prend le blanc le plus proche
      function findStart(x, y) {
        for (var r = 0; r <= 14; r++) {
          for (var dy = -r; dy <= r; dy++) {
            for (var dx = -r; dx <= r; dx++) {
              if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
              var px = x + dx, py = y + dy;
              if (px < 0 || py < 0 || px >= bw || py >= bh) continue;
              if (!barrier[py * bw + px]) return py * bw + px;
            }
          }
        }
        return -1;
      }

      // Remplissage par lignes ; renvoie le rectangle touché
      function flood(start) {
        var w = bw, hh = bh;
        var sx = start % w, sy = (start / w) | 0;
        var x0 = sx, x1 = sx, y0 = sy, y1 = sy;
        var stack = [sx, sy];
        while (stack.length) {
          var y = stack.pop(), x = stack.pop(), i = y * w + x;
          if (region[i]) continue;
          while (x > 0 && !barrier[i - 1] && !region[i - 1]) { x--; i--; }
          if (x < x0) x0 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
          var up = false, down = false;
          while (x < w && !barrier[i] && !region[i]) {
            region[i] = 1;
            if (y > 0) {
              if (!barrier[i - w] && !region[i - w]) {
                if (!up) { stack.push(x, y - 1); up = true; }
              } else up = false;
            }
            if (y < hh - 1) {
              if (!barrier[i + w] && !region[i + w]) {
                if (!down) { stack.push(x, y + 1); down = true; }
              } else down = false;
            }
            x++;
            i++;
          }
          if (x - 1 > x1) x1 = x - 1;
        }
        // On déborde de 3 pixels sous les traits pour ne pas laisser de liseré blanc
        for (var p = 2; p <= 4; p++) {
          x0 = Math.max(0, x0 - 1); y0 = Math.max(0, y0 - 1);
          x1 = Math.min(w - 1, x1 + 1); y1 = Math.min(hh - 1, y1 + 1);
          for (var yy = y0; yy <= y1; yy++) {
            for (var xx = x0; xx <= x1; xx++) {
              var k = yy * w + xx;
              if (region[k] || !barrier[k]) continue;
              var v;
              if ((xx > 0 && (v = region[k - 1]) && v < p) ||
                (xx < w - 1 && (v = region[k + 1]) && v < p) ||
                (yy > 0 && (v = region[k - w]) && v < p) ||
                (yy < hh - 1 && (v = region[k + w]) && v < p)) region[k] = p;
            }
          }
        }
        return { x0: x0, y0: y0, x1: x1, y1: y1 };
      }

      function commit() {
        if (!anim) return;
        pctx.drawImage(fillLayer, 0, 0);
        anim = null;
      }

      function fillAt(bx, by) {
        commit();
        var start = findStart(Math.round(bx), Math.round(by));
        if (start < 0) return;
        var box = flood(start);
        var bwBox = box.x1 - box.x0 + 1, bhBox = box.y1 - box.y0 + 1;
        var img = fctx.createImageData(bwBox, bhBox);
        var px = img.data, rgb = hexToRgb(color);
        for (var y = 0; y < bhBox; y++) {
          var row = (box.y0 + y) * bw + box.x0;
          for (var x = 0; x < bwBox; x++) {
            if (region[row + x]) {
              var o = (y * bwBox + x) * 4;
              px[o] = rgb[0]; px[o + 1] = rgb[1]; px[o + 2] = rgb[2]; px[o + 3] = 255;
            }
          }
          region.fill(0, row, row + bwBox);
        }
        fctx.clearRect(0, 0, bw, bh);
        fctx.putImageData(img, box.x0, box.y0);

        // Rayon nécessaire pour couvrir toute la zone depuis le doigt
        var far = Math.max(
          Math.hypot(bx - box.x0, by - box.y0), Math.hypot(bx - box.x1, by - box.y0),
          Math.hypot(bx - box.x0, by - box.y1), Math.hypot(bx - box.x1, by - box.y1));
        anim = { x: bx, y: by, r: 0, max: far + 2 };
        App.Sfx.plop(App.rand(0.8, 1.4));
        kit.loop(function (dt) {
          if (!anim) return false;
          anim.r += dt * Math.max(anim.max / 0.35, 600);
          if (anim.r >= anim.max) { commit(); render(); return false; }
          render();
        });
      }

      // ---- Crayon et gomme (plusieurs doigts possibles)
      // La gomme peint en blanc, plus large : les traits du dessin restent par-dessus.
      var pens = {};
      function penLine(a, b) {
        commit();
        var eraser = mode === 'eraser';
        pctx.strokeStyle = eraser ? '#ffffff' : color;
        pctx.lineWidth = Math.max(bw, bh) / (eraser ? 16 : 40);
        pctx.lineCap = 'round';
        pctx.lineJoin = 'round';
        pctx.beginPath();
        pctx.moveTo(a.x, a.y);
        pctx.lineTo(b.x, b.y);
        pctx.stroke();
        draw();
      }

      var pending = false;
      function draw() {
        if (pending) return;
        pending = true;
        requestAnimationFrame(function () {
          pending = false;
          if (kit.alive()) render();
        });
      }

      // Position du doigt en pixels du dessin
      function pagePos(e) {
        var q = App.localPos(e, canvas);
        return { x: (q.x * size.dpr - rect.x) / sc, y: (q.y * size.dpr - rect.y) / sc };
      }

      kit.on(canvas, 'pointerdown', function (e) {
        if (!paint) return;
        var p = pagePos(e);
        if (p.x < 0 || p.y < 0 || p.x >= bw || p.y >= bh) return;
        if (mode === 'fill') { fillAt(p.x, p.y); return; }
        pens[e.pointerId] = p;
        penLine(p, { x: p.x + 0.1, y: p.y });
      });
      kit.on(canvas, 'pointermove', function (e) {
        var last = pens[e.pointerId];
        if (!last) return;
        var p = pagePos(e);
        penLine(last, p);
        pens[e.pointerId] = p;
      });
      function penUp(e) { delete pens[e.pointerId]; }
      kit.on(canvas, 'pointerup', penUp);
      kit.on(canvas, 'pointercancel', penUp);
      kit.on(window, 'resize', function () { commit(); setup(true); });

      App.say('Coloriage ! Choisis une couleur.');
      Store.list('coloring').then(function (items) {
        if (!kit.alive()) return;
        pages = buildPages(items);
        loadPage(0, true);
      });
    }
  });
})();
