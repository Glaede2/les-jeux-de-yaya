/*
 * Puzzles : de vraies pièces de puzzle (avec tenons et creux), 8, 16, 24 ou 35 pièces.
 * Le plateau est au centre avec le modèle en transparence ; les pièces sont rangées
 * de chaque côté, en plus petit, et reprennent leur taille quand on les prend.
 * Une pièce lâchée près de sa place s'aimante.
 *
 * Pour rester fluide sur une petite tablette, chaque pièce est dessinée une seule fois
 * dans sa propre image (sprite), et le plateau aussi : ensuite on ne fait que les coller.
 */
(function () {
  'use strict';

  var LEVELS = [
    { n: 8, cols: 4, rows: 2 },
    { n: 16, cols: 4, rows: 4 },
    { n: 24, cols: 6, rows: 4 },
    { n: 35, cols: 7, rows: 5 }
  ];
  var TAB = 0.26; // hauteur d'un tenon, en fraction du petit côté d'une pièce

  function newCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  }

  // Un bord de pièce de P0 à P1 ; s = +1 tenon vers l'extérieur, -1 creux, 0 bord droit.
  // (nx, ny) = normale vers l'extérieur de la pièce, t = hauteur du tenon en pixels.
  var SHAPE = [ // [u, v] : u le long du bord, v vers l'extérieur
    [[0.40, 0], [0.42, 0.22], [0.38, 0.43]],
    [[0.33, 0.71], [0.40, 1], [0.50, 1]],
    [[0.60, 1], [0.67, 0.71], [0.62, 0.43]],
    [[0.58, 0.22], [0.60, 0], [0.64, 0]]
  ];
  function edge(path, x0, y0, x1, y1, nx, ny, s, t) {
    if (!s) { path.lineTo(x1, y1); return; }
    var dx = x1 - x0, dy = y1 - y0;
    function P(u, v) { return [x0 + dx * u + nx * v * s * t, y0 + dy * u + ny * v * s * t]; }
    var a = P(0.36, 0);
    path.lineTo(a[0], a[1]);
    SHAPE.forEach(function (seg) {
      var p1 = P(seg[0][0], seg[0][1]), p2 = P(seg[1][0], seg[1][1]), p3 = P(seg[2][0], seg[2][1]);
      path.bezierCurveTo(p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]);
    });
    path.lineTo(x1, y1);
  }

  // Contour d'une pièce, dans son repère (0..w, 0..h)
  function piecePath(w, h, top, right, bottom, left, t) {
    var p = new Path2D();
    p.moveTo(0, 0);
    edge(p, 0, 0, w, 0, 0, -1, top, t);
    edge(p, w, 0, w, h, 1, 0, right, t);
    edge(p, w, h, 0, h, 0, 1, bottom, t);
    edge(p, 0, h, 0, 0, -1, 0, left, t);
    p.closePath();
    return p;
  }

  App.register({
    id: 'puzzle',
    name: 'Puzzles',
    icon: '🧩',
    color: '#ffb347',
    start: function (kit) {
      var h = App.h;
      var wrap = h('div', 'puzzle', kit.root);
      var canvas = h('canvas', null, wrap);
      var progress = h('div', 'puzzle-progress', wrap);
      var bar = h('div', 'bar', wrap);
      var ctx = canvas.getContext('2d');

      var saved = Store.getSetting('puzzle.level', 8);
      var level = LEVELS.filter(function (l) { return l.n === saved; })[0] || LEVELS[0];
      var imgIdx = 0, sources = [], loadToken = 0, lastPhoto = null;
      var size, dpr, W, H;
      var board, boardCache, img, pieces = [], drag = null, done = false, trayK = 1;
      var showModel = false, sparks = [];

      // ---- Barre du haut : nombre de pièces, modèle, image suivante
      App.levelPicker(bar, '🧩', LEVELS, LEVELS.indexOf(level), function (i) {
        level = LEVELS[i];
        Store.setSetting('puzzle.level', level.n);
        newPuzzle();
      });
      var bModel = h('button', 'round-btn', bar, '👁️');
      kit.on(bModel, 'pointerdown', function () {
        if (done || !img) return;
        App.bounce(bModel);
        showModel = true;
        draw();
        kit.later(function () { showModel = false; draw(); }, 2500);
      });
      var bNext = h('button', 'round-btn', bar, '🖼️');
      kit.on(bNext, 'pointerdown', function () {
        if (!sources.length) return;
        App.bounce(bNext);
        imgIdx = (imgIdx + 1) % sources.length;
        newPuzzle();
      });

      // ---- Images : dessins de base (si activés) + photos des parents
      function buildSources(items) {
        if (Store.showBuiltins('puzzle') || !items.length) {
          Drawings.pages.forEach(function (d) {
            sources.push({
              name: d.name, aspect: Drawings.W / Drawings.H,
              render: function (w, hh) { return Drawings.toImage(d, w, hh); }
            });
          });
        }
        items.forEach(function (it) { sources.push({ name: it.name, src: it.data }); });
      }

      // Les photos ne sont décodées qu'au moment de jouer (une seule à la fois en mémoire)
      function ready(s) {
        if (s.render) return Promise.resolve();
        return Store.loadImage(s.src).then(function (im) {
          if (lastPhoto) lastPhoto.render = null;
          lastPhoto = s;
          s.aspect = im.width / im.height;
          s.render = function (w, hh) {
            var c = newCanvas(w, hh);
            c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
            return c;
          };
        });
      }

      function newPuzzle() {
        if (!sources.length) return;
        var s = sources[imgIdx], token = ++loadToken;
        ready(s).then(function () {
          if (kit.alive() && token === loadToken) build(s);
        });
      }

      // ---- Construction du puzzle
      function build(s) {
        size = App.fitCanvas(canvas);
        dpr = size.dpr;
        W = canvas.width;
        H = canvas.height;
        done = false;
        drag = null;
        showModel = false;
        sparks = [];

        // Plateau centré, rangement à gauche et à droite
        var top = H * 0.16, maxW = W * 0.56, maxH = H * 0.8;
        var bw = Math.min(maxW, maxH * s.aspect), bh = bw / s.aspect;
        board = { x: (W - bw) / 2, y: top + (H - top - bh) / 2, w: bw, h: bh };
        img = s.render(board.w, board.h);

        // Image en hauteur : on découpe dans l'autre sens
        var cols = s.aspect >= 1 ? level.cols : level.rows;
        var rows = s.aspect >= 1 ? level.rows : level.cols;
        var pw = bw / cols, ph = bh / rows;
        var t = Math.min(pw, ph) * TAB, pad = Math.ceil(t + 3 * dpr);

        // Sens des tenons, au hasard (deux pièces voisines s'emboîtent forcément)
        var hs = [], vs = [];
        for (var r = 0; r < rows; r++) {
          hs.push([]); vs.push([]);
          for (var c = 0; c < cols; c++) {
            hs[r].push(Math.random() < 0.5 ? 1 : -1);
            vs[r].push(Math.random() < 0.5 ? 1 : -1);
          }
        }

        // Plateau pré-dessiné : fond blanc, modèle pâle, contours des pièces
        boardCache = newCanvas(W, H);
        var bctx = boardCache.getContext('2d');
        bctx.fillStyle = 'rgba(255,255,255,.9)';
        bctx.fillRect(board.x - 6 * dpr, board.y - 6 * dpr, bw + 12 * dpr, bh + 12 * dpr);
        bctx.globalAlpha = 0.22;
        bctx.drawImage(img, board.x, board.y, bw, bh);
        bctx.globalAlpha = 1;
        bctx.strokeStyle = 'rgba(58,46,90,.28)';
        bctx.lineWidth = 1.5 * dpr;

        pieces = [];
        for (r = 0; r < rows; r++) {
          for (c = 0; c < cols; c++) {
            var path = piecePath(pw, ph,
              r === 0 ? 0 : -hs[r - 1][c], c === cols - 1 ? 0 : vs[r][c],
              r === rows - 1 ? 0 : hs[r][c], c === 0 ? 0 : -vs[r][c - 1], t);

            bctx.save();
            bctx.translate(board.x + c * pw, board.y + r * ph);
            bctx.stroke(path);
            bctx.restore();

            // Image de la pièce, avec une marge pour les tenons
            var sp = newCanvas(pw + pad * 2, ph + pad * 2);
            var sctx = sp.getContext('2d');
            sctx.translate(pad, pad);
            sctx.save();
            sctx.clip(path);
            sctx.drawImage(img, -c * pw, -r * ph, bw, bh);
            sctx.restore();
            sctx.lineWidth = 2 * dpr;
            sctx.strokeStyle = 'rgba(255,255,255,.75)';
            sctx.stroke(path);
            sctx.lineWidth = 1 * dpr;
            sctx.strokeStyle = 'rgba(58,46,90,.45)';
            sctx.stroke(path);

            pieces.push({
              sprite: sp, pad: pad, w: pw, h: ph,
              tx: board.x + c * pw, ty: board.y + r * ph, // place finale (coin haut-gauche)
              x: 0, y: 0, k: 1, placed: false
            });
          }
        }
        layoutTray();
        updateProgress();
        App.Sfx.flip();
        if (s.name) App.say(s.name);
        draw();
      }

      // Range les pièces en grille, moitié à gauche, moitié à droite, en plus petit
      function layoutTray() {
        var top = H * 0.16, margin = W * 0.012, gap = W * 0.015;
        var strips = [
          { x: margin, w: board.x - gap - margin },
          { x: board.x + board.w + gap, w: W - margin - (board.x + board.w + gap) }
        ];
        var p0 = pieces[0], fw = p0.w + p0.pad * 1.2, fh = p0.h + p0.pad * 1.2;
        var counts = [Math.ceil(pieces.length / 2), Math.floor(pieces.length / 2)];
        var slots = [];
        trayK = 1;
        strips.forEach(function (st, i) {
          var n = counts[i], best = null;
          for (var cols = 1; cols <= n; cols++) { // le nombre de colonnes qui laisse les pièces les plus grandes
            var rows = Math.ceil(n / cols);
            var k = Math.min(st.w / cols / fw, (H - top - margin) / rows / fh);
            if (!best || k > best.k) best = { cols: cols, rows: rows, k: k };
          }
          st.grid = best;
          trayK = Math.min(trayK, best.k * 0.92);
        });
        strips.forEach(function (st, i) {
          var g = st.grid, cw = st.w / g.cols, ch = (H - top - margin) / g.rows;
          for (var j = 0; j < counts[i]; j++) {
            slots.push({ cx: st.x + (j % g.cols + 0.5) * cw, cy: top + (Math.floor(j / g.cols) + 0.5) * ch });
          }
        });
        App.shuffle(slots);
        pieces.forEach(function (p, i) {
          p.k = trayK;
          p.placed = false;
          p.x = slots[i].cx - p.w * p.k / 2 + App.rand(-1, 1) * p.w * p.k * 0.08;
          p.y = slots[i].cy - p.h * p.k / 2 + App.rand(-1, 1) * p.h * p.k * 0.08;
        });
      }

      function updateProgress() {
        var n = pieces.filter(function (p) { return p.placed; }).length;
        progress.textContent = n + ' / ' + pieces.length;
      }

      // ---- Dessin (uniquement quand quelque chose change)
      var pending = false;
      function draw() {
        if (pending) return;
        pending = true;
        requestAnimationFrame(function () {
          pending = false;
          if (kit.alive()) render();
        });
      }

      function drawPiece(p, lifted) {
        var k = p.k;
        if (lifted) {
          ctx.save();
          ctx.shadowColor = 'rgba(58,46,90,.45)';
          ctx.shadowBlur = 14 * dpr;
          ctx.shadowOffsetY = 8 * dpr;
        }
        ctx.drawImage(p.sprite, p.x - p.pad * k, p.y - p.pad * k, p.sprite.width * k, p.sprite.height * k);
        if (lifted) ctx.restore();
      }

      function render() {
        if (!boardCache) return;
        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(boardCache, 0, 0);
        if (done || showModel) {
          ctx.drawImage(img, board.x, board.y, board.w, board.h);
        } else {
          pieces.forEach(function (p) { if (p.placed) drawPiece(p); });
        }
        pieces.forEach(function (p) { if (!p.placed && (!drag || p !== drag.p)) drawPiece(p); });
        if (drag) drawPiece(drag.p, true);

        sparks.forEach(function (s) {
          ctx.globalAlpha = Math.max(0, s.life / 0.5);
          ctx.fillStyle = s.c;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
      }

      // ---- Glisser-déposer
      function devPos(e) {
        var q = App.localPos(e, canvas);
        return { x: q.x * dpr, y: q.y * dpr };
      }

      kit.on(canvas, 'pointerdown', function (e) {
        if (drag || done || !boardCache) return;
        var q = devPos(e);
        for (var i = pieces.length - 1; i >= 0; i--) {
          var p = pieces[i];
          if (p.placed) continue;
          // on accepte un peu autour du corps de la pièce (les tenons dépassent)
          var w = p.w * p.k, hh = p.h * p.k, m = p.pad * p.k * 0.6;
          if (q.x >= p.x - m && q.x <= p.x + w + m && q.y >= p.y - m && q.y <= p.y + hh + m) {
            pieces.splice(i, 1);
            pieces.push(p); // passe au-dessus des autres
            // La pièce reprend sa vraie taille, le doigt garde le même endroit de la pièce
            var rx = (q.x - p.x) / w, ry = (q.y - p.y) / hh;
            p.k = 1;
            p.x = q.x - rx * p.w;
            p.y = q.y - ry * p.h;
            drag = { p: p, id: e.pointerId, dx: q.x - p.x, dy: q.y - p.y };
            App.Sfx.tap();
            draw();
            return;
          }
        }
      });

      kit.on(canvas, 'pointermove', function (e) {
        if (!drag || e.pointerId !== drag.id) return;
        var q = devPos(e);
        drag.p.x = q.x - drag.dx;
        drag.p.y = q.y - drag.dy;
        draw();
      });

      function release(e) {
        if (!drag || e.pointerId !== drag.id) return;
        var p = drag.p;
        drag = null;
        // Aimant généreux : à 40 % de la taille d'une pièce
        var tol = Math.min(p.w, p.h) * 0.4;
        if (Math.abs(p.x - p.tx) < tol && Math.abs(p.y - p.ty) < tol) {
          p.x = p.tx;
          p.y = p.ty;
          p.placed = true;
          App.Sfx.snap();
          burst(p.tx + p.w / 2, p.ty + p.h / 2);
          updateProgress();
          if (pieces.every(function (x) { return x.placed; })) win();
        } else { // pas à sa place : elle rapetisse là où on l'a lâchée
          var q = devPos(e);
          var rx = (q.x - p.x) / p.w, ry = (q.y - p.y) / p.h;
          p.k = trayK;
          p.x = Math.min(Math.max(q.x - rx * p.w * p.k, 0), W - p.w * p.k);
          p.y = Math.min(Math.max(q.y - ry * p.h * p.k, H * 0.14), H - p.h * p.k);
        }
        draw();
      }
      kit.on(canvas, 'pointerup', release);
      kit.on(canvas, 'pointercancel', release);

      // Petites étincelles quand une pièce trouve sa place
      var SPARK = ['#ffd23f', '#ff70a6', '#4cc9f0', '#8ac926'];
      function burst(x, y) {
        for (var i = 0; i < 10; i++) {
          var a = i / 10 * Math.PI * 2, v = App.rand(120, 260) * dpr;
          sparks.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: App.rand(3, 6) * dpr, life: 0.5, c: App.pick(SPARK) });
        }
        kit.loop(function (dt) {
          sparks.forEach(function (s) { s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt; });
          sparks = sparks.filter(function (s) { return s.life > 0; });
          render();
          return sparks.length > 0;
        });
      }

      function win() {
        done = true;
        var name = sources[imgIdx].name;
        kit.later(function () {
          App.celebrate(name ? 'Bravo ! ' + name + ' !' : null);
        }, 300);
        var token = loadToken; // ignoré si on a changé d'image ou de niveau entre-temps
        kit.later(function () {
          if (token !== loadToken) return;
          imgIdx = (imgIdx + 1) % sources.length;
          newPuzzle();
        }, 5000);
      }

      kit.on(window, 'resize', newPuzzle);
      Store.list('puzzle').then(function (items) {
        if (!kit.alive()) return;
        buildSources(items);
        newPuzzle();
      });
    }
  });
})();
