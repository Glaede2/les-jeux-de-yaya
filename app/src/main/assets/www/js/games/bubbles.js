/*
 * Bulles : des bulles montent, on les éclate.
 *  - Éclater vite fait une petite mélodie (do ré mi...) qui monte.
 *  - On peut balayer l'écran du doigt pour en éclater plusieurs.
 *  - Toucher ou glisser dans le vide souffle de nouvelles petites bulles.
 *  - Mission couleur : « Les bulles bleues ! » ; 5 bulles de la bonne couleur = bravo.
 *  - Des amis (animaux, fruits) cachés dans des bulles s'envolent sur l'étagère du bas ;
 *    quand elle est pleine, c'est la fête.
 *  - Bulle géante : il faut la toucher 3 fois, elle explose en plein de petites bulles.
 *  - Bulle étoile dorée (rare) : pluie d'étoiles.
 * Tout est pré-dessiné en sprites pour rester fluide sur une petite tablette.
 */
(function () {
  'use strict';

  var HUES = ['#ff8fab', '#ffd23f', '#8ac926', '#4cc9f0', '#b388ff', '#ff9f1c'];
  var HUE_NAMES = ['roses', 'jaunes', 'vertes', 'bleues', 'violettes', 'orange'];
  var INSIDE = ['🐟', '🐙', '🐢', '🦀', '🐳', '🍓', '🍎', '🍌', '🐞', '🐥', '🦋', '🐸'];
  var SCALE = [523, 587, 659, 698, 784, 880, 988, 1047]; // do ré mi fa sol la si do
  var SPRITE = 128, SHELF = 8, MISSION = 5;

  function canvasOf(size) {
    var c = document.createElement('canvas');
    c.width = c.height = size;
    return c;
  }

  function bubbleSprite(color) {
    var c = canvasOf(SPRITE), g = c.getContext('2d'), r = SPRITE / 2;
    var grad = g.createRadialGradient(r * 0.7, r * 0.6, r * 0.1, r, r, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)');
    grad.addColorStop(0.35, color + '88');
    grad.addColorStop(0.9, color + 'cc');
    grad.addColorStop(1, color);
    g.fillStyle = grad;
    g.beginPath();
    g.arc(r, r, r - 2, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.8)';
    g.beginPath();
    g.ellipse(r * 0.6, r * 0.5, r * 0.22, r * 0.12, -0.6, 0, Math.PI * 2);
    g.fill();
    return c;
  }

  function starPath(g, cx, cy, ro, ri) {
    g.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? ri : ro;
      g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    g.closePath();
  }

  function goldSprite() {
    var c = canvasOf(SPRITE), g = c.getContext('2d'), r = SPRITE / 2;
    var grad = g.createRadialGradient(r * 0.7, r * 0.6, r * 0.1, r, r, r);
    grad.addColorStop(0, '#fffbe0');
    grad.addColorStop(0.5, '#ffe066');
    grad.addColorStop(1, '#ff9f1c');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(r, r, r - 2, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffffff';
    g.strokeStyle = '#ffb703';
    g.lineWidth = 4;
    starPath(g, r, r * 1.04, r * 0.5, r * 0.22);
    g.fill();
    g.stroke();
    return c;
  }

  function starSprite() {
    var c = canvasOf(64), g = c.getContext('2d');
    g.fillStyle = '#ffe14d';
    g.strokeStyle = '#ffffff';
    g.lineWidth = 4;
    starPath(g, 32, 34, 28, 12);
    g.fill();
    g.stroke();
    return c;
  }

  function emojiSprite(e) {
    var c = canvasOf(SPRITE), g = c.getContext('2d');
    g.font = (SPRITE * 0.7) + 'px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(e, SPRITE / 2, SPRITE / 2 + SPRITE * 0.05);
    return c;
  }

  // Créés une seule fois, au premier lancement du jeu
  var S = null;

  App.register({
    id: 'bubbles',
    name: 'Bulles',
    icon: '🧼',
    color: '#5ec8f2',
    start: function (kit) {
      if (!S) {
        S = { bubbles: HUES.map(bubbleSprite), gold: goldSprite(), star: starSprite(), emojis: INSIDE.map(emojiSprite) };
      }
      var wrap = App.h('div', 'bubbles', kit.root);
      var canvas = App.h('canvas', null, wrap);
      var ctx = canvas.getContext('2d');
      var W, H, dpr;
      var bubbles = [], parts = [], stars = [], flyers = [];
      var spawn = 0, combo = 0, lastPop = 0, clock = 0;
      var shelf = [], party = 0;          // amis rangés en bas
      var mission = { hue: 0, count: 0, done: false };

      function resize() {
        var s = App.fitCanvas(canvas);
        W = canvas.width; H = canvas.height; dpr = s.dpr;
      }

      // ------------------------------------------------------------ Création des bulles
      function addBubble(o) {
        var b = {
          x: 0, y: H, r: H * 0.1, vx: 0, vy: H * 0.12,
          ph: App.rand(0, 6), sp: App.rand(1, 2.2), type: 'normal',
          hue: 0, inside: -1, hits: 0, wob: 0, hitAt: 0, born: clock
        };
        for (var k in o) b[k] = o[k];
        bubbles.push(b);
        return b;
      }

      function spawnRandom() {
        var hasStar = bubbles.some(function (b) { return b.type === 'star'; });
        var hasGiant = bubbles.some(function (b) { return b.type === 'giant'; });
        var roll = Math.random();
        if (roll < 0.05 && !hasStar) {
          var rs = H * 0.09;
          addBubble({ type: 'star', r: rs, x: App.rand(rs, W - rs), y: H + rs, vy: H * 0.2 });
        } else if (roll < 0.11 && !hasGiant) {
          var rg = H * 0.19;
          addBubble({ type: 'giant', r: rg, x: App.rand(rg, W - rg), y: H + rg, vy: H * 0.06, hue: Math.floor(Math.random() * HUES.length) });
        } else {
          var r = App.rand(0.07, 0.12) * H;
          // la couleur de la mission sort plus souvent
          var hue = Math.random() < 0.35 ? mission.hue : Math.floor(Math.random() * HUES.length);
          addBubble({
            r: r, x: App.rand(r, W - r), y: H + r, vy: App.rand(0.09, 0.16) * H, hue: hue,
            inside: Math.random() < 0.3 ? Math.floor(Math.random() * INSIDE.length) : -1
          });
        }
      }

      // Bulles soufflées par le doigt
      function blow(x, y) {
        if (bubbles.length >= 30) return;
        var r = App.rand(0.035, 0.06) * H;
        addBubble({
          x: x, y: y, r: r, vx: App.rand(-1, 1) * H * 0.15, vy: App.rand(0.2, 0.32) * H,
          hue: Math.floor(Math.random() * HUES.length), small: true
        });
        App.Sfx.tone(App.rand(900, 1300), 0.05, { type: 'triangle', vol: 0.05 });
      }

      // ------------------------------------------------------------ Éclatement
      function popSound() {
        var now = performance.now();
        combo = now - lastPop < 900 ? combo + 1 : 0;
        lastPop = now;
        var f = SCALE[combo % SCALE.length];
        App.Sfx.tone(f * 0.75, 0.18, { slide: f * 1.4, vol: 0.28 });
        if (combo > 0 && combo % SCALE.length === SCALE.length - 1) { // gamme complète !
          App.Sfx.success();
          App.confetti(30);
        }
      }

      function burst(x, y, r, n) {
        for (var i = 0; i < n; i++) {
          var a = i / n * Math.PI * 2;
          parts.push({ x: x, y: y, vx: Math.cos(a) * r * 3, vy: Math.sin(a) * r * 3, life: 0.4, r: r * 0.12 });
        }
      }

      function pop(b, i) {
        bubbles.splice(i, 1);
        burst(b.cx, b.y, b.r, 10);
        popSound();
        if (b.type === 'star') return starRain();
        if (b.inside >= 0) flyToShelf(b);
        if (!b.small && b.hue === mission.hue && !mission.done) missionStep();
      }

      // La bulle géante grossit à chaque toucher, puis explose en petites bulles
      function hitGiant(b, i) {
        var now = performance.now();
        if (now - b.hitAt < 250) return;
        b.hitAt = now;
        b.hits++;
        if (b.hits < 3) {
          b.r *= 1.12;
          b.wob = 1;
          App.Sfx.tone(220 + b.hits * 80, 0.3, { type: 'triangle', slide: 440 + b.hits * 120, vol: 0.25 });
          return;
        }
        bubbles.splice(i, 1);
        burst(b.cx, b.y, b.r, 16);
        App.Sfx.tone(160, 0.4, { slide: 900, vol: 0.35 });
        for (var k = 0; k < 9; k++) {
          var a = k / 9 * Math.PI * 2, r = App.rand(0.05, 0.08) * H;
          addBubble({
            x: b.cx, y: b.y, r: r, vx: Math.cos(a) * H * 0.9, vy: H * 0.1 - Math.sin(a) * H * 0.5,
            hue: k % HUES.length, inside: k % 3 === 0 ? Math.floor(Math.random() * INSIDE.length) : -1
          });
        }
      }

      function starRain() {
        App.say('Waouh, une étoile !');
        App.confetti(40);
        [784, 988, 1175, 1568].forEach(function (f, i) {
          App.Sfx.tone(f, 0.35, { type: 'triangle', vol: 0.18, delay: i * 0.07 });
        });
        for (var i = 0; i < 24; i++) {
          stars.push({
            x: App.rand(0, W), y: -App.rand(0, H * 0.5), vy: App.rand(0.35, 0.7) * H,
            rot: App.rand(0, 6), vr: App.rand(-4, 4), s: App.rand(0.04, 0.08) * H
          });
        }
      }

      // ------------------------------------------------------------ Mission couleur
      function newMission() {
        var h;
        do { h = Math.floor(Math.random() * HUES.length); } while (h === mission.hue);
        mission = { hue: h, count: 0, done: false };
        App.say('Les bulles ' + HUE_NAMES[h] + ' !');
      }

      function missionStep() {
        mission.count++;
        App.Sfx.tone(1320, 0.12, { type: 'triangle', vol: 0.15, delay: 0.08 });
        App.Sfx.tone(1760, 0.18, { type: 'triangle', vol: 0.15, delay: 0.16 });
        if (mission.count >= MISSION) {
          mission.done = true;
          kit.later(function () { App.celebrate(); }, 300);
          kit.later(newMission, 3000);
        }
      }

      // ------------------------------------------------------------ Étagère des amis
      function slotPos(i) {
        var size = H * 0.11, gap = H * 0.025;
        var total = SHELF * size + (SHELF - 1) * gap;
        return { x: (W - total) / 2 + i * (size + gap) + size / 2, y: H - H * 0.085, s: size };
      }

      function flyToShelf(b) {
        var slot = shelf.length + flyers.length;
        if (slot >= SHELF || party > 0) return;
        flyers.push({ e: b.inside, x0: b.cx, y0: b.y, s0: b.r * 1.2, slot: slot, t: 0 });
      }

      function landed(f) {
        shelf.push(f.e);
        App.Sfx.tone(1047, 0.1, { type: 'triangle', vol: 0.15 });
        if (shelf.length >= SHELF) {
          party = 3;
          App.celebrate('Tous tes amis sont là !');
        }
      }

      // ------------------------------------------------------------ Doigts
      var fingers = {};

      function tryPop(x, y, tap) {
        for (var i = bubbles.length - 1; i >= 0; i--) {
          var b = bubbles[i];
          if (b.cx == null) continue; // pas encore affichée
          // en balayant, on n'éclate pas les bulles qu'on vient de souffler
          if (!tap && b.small && clock - b.born < 0.6) continue;
          var dx = x - b.cx, dy = y - b.y;
          var tol = b.r * 1.2; // un peu plus grand que la bulle : plus facile
          if (dx * dx + dy * dy < tol * tol) {
            if (b.type === 'giant') { if (tap) hitGiant(b, i); return true; }
            pop(b, i);
            return true;
          }
        }
        return false;
      }

      function pos(e) {
        var q = App.localPos(e, canvas);
        return { x: q.x * dpr, y: q.y * dpr };
      }

      kit.on(canvas, 'pointerdown', function (e) {
        var p = pos(e);
        fingers[e.pointerId] = { x: p.x, y: p.y, t: 0 };
        if (!tryPop(p.x, p.y, true)) blow(p.x, p.y);
      });
      kit.on(canvas, 'pointermove', function (e) {
        var f = fingers[e.pointerId];
        if (!f) return;
        var p = pos(e);
        if (tryPop(p.x, p.y, false)) return;
        // en glissant dans le vide, on souffle des bulles (pas trop souvent)
        var dx = p.x - f.x, dy = p.y - f.y;
        if (dx * dx + dy * dy > H * H * 0.004 && clock - f.t > 0.08) {
          blow(p.x, p.y);
          f.x = p.x; f.y = p.y; f.t = clock;
        }
      });
      function up(e) { delete fingers[e.pointerId]; }
      kit.on(canvas, 'pointerup', up);
      kit.on(canvas, 'pointercancel', up);
      kit.on(window, 'resize', resize);

      // ------------------------------------------------------------ Boucle
      function pill(x0, y0, w, hh) {
        var x1 = x0 + w, rr = hh / 2;
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.moveTo(x0 + rr, y0);
        ctx.arcTo(x1, y0, x1, y0 + hh, rr);
        ctx.arcTo(x1, y0 + hh, x0, y0 + hh, rr);
        ctx.arcTo(x0, y0 + hh, x0, y0, rr);
        ctx.arcTo(x0, y0, x1, y0, rr);
        ctx.fill();
      }

      function drawShelf(t) {
        var p0 = slotPos(0), pl = slotPos(SHELF - 1);
        pill(p0.x - p0.s * 0.7, p0.y - p0.s * 0.65, pl.x - p0.x + p0.s * 1.4, p0.s * 1.3);
        for (var i = 0; i < SHELF; i++) {
          var p = slotPos(i);
          if (i < shelf.length) {
            var jump = party > 0 ? Math.abs(Math.sin(t * 9 + i)) * p.s * 0.35 : 0;
            ctx.drawImage(S.emojis[shelf[i]], p.x - p.s / 2, p.y - p.s / 2 - jump, p.s, p.s);
          } else {
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.s * 0.3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      function drawMission() {
        var s = H * 0.09, x = W / 2 - s * 2, y = H * 0.035;
        pill(x - s * 0.8, y - s * 0.2, s * 1.6 + MISSION * s * 0.55 + s * 0.3, s * 1.4);
        ctx.drawImage(S.bubbles[mission.hue], x - s / 2, y, s, s);
        for (var i = 0; i < MISSION; i++) {
          ctx.fillStyle = i < mission.count ? HUES[mission.hue] : 'rgba(255,255,255,0.45)';
          ctx.beginPath();
          ctx.arc(x + s * 0.9 + i * s * 0.55, y + s / 2, s * 0.18, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      resize();
      mission.hue = Math.floor(Math.random() * HUES.length);
      for (var i = 0; i < 4; i++) { spawnRandom(); bubbles[i].y = App.rand(H * 0.3, H); }
      App.say('Éclate les bulles ' + HUE_NAMES[mission.hue] + ' !');

      kit.loop(function (dt) {
        clock += dt;
        spawn -= dt;
        var big = bubbles.filter(function (b) { return !b.small; }).length;
        if (spawn <= 0 && big < 9) { spawnRandom(); spawn = App.rand(0.5, 1.0); }
        if (party > 0) {
          party -= dt;
          if (party <= 0) shelf = [];
        }

        ctx.clearRect(0, 0, W, H);
        drawShelf(clock);
        drawMission();

        for (var i = bubbles.length - 1; i >= 0; i--) {
          var b = bubbles[i];
          b.y -= b.vy * dt;
          b.x += b.vx * dt;
          b.vx *= Math.pow(0.15, dt); // l'élan latéral s'amortit
          b.x = Math.min(Math.max(b.x, b.r * 0.5), W - b.r * 0.5);
          if (b.y < -b.r * 1.5) { bubbles.splice(i, 1); continue; }
          b.cx = b.x + Math.sin(clock * b.sp + b.ph) * b.r * 0.3; // balancement
          b.wob = Math.max(0, b.wob - dt * 2);
          var r = b.r * (1 + Math.sin(clock * 30) * 0.12 * b.wob);
          if (b.inside >= 0) ctx.drawImage(S.emojis[b.inside], b.cx - r * 0.6, b.y - r * 0.6, r * 1.2, r * 1.2);
          var img = b.type === 'star' ? S.gold : S.bubbles[b.hue];
          ctx.drawImage(img, b.cx - r, b.y - r, r * 2, r * 2);
        }

        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        for (var j = parts.length - 1; j >= 0; j--) {
          var p = parts[j];
          p.life -= dt;
          if (p.life <= 0) { parts.splice(j, 1); continue; }
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * (p.life / 0.4), 0, Math.PI * 2);
          ctx.fill();
        }

        for (var k = stars.length - 1; k >= 0; k--) {
          var st = stars[k];
          st.y += st.vy * dt;
          st.rot += st.vr * dt;
          if (st.y > H + st.s) { stars.splice(k, 1); continue; }
          ctx.save();
          ctx.translate(st.x, st.y);
          ctx.rotate(st.rot);
          ctx.drawImage(S.star, -st.s / 2, -st.s / 2, st.s, st.s);
          ctx.restore();
        }

        // Amis qui volent vers l'étagère, en arc
        for (var m = flyers.length - 1; m >= 0; m--) {
          var f = flyers[m], dest = slotPos(f.slot);
          f.t = Math.min(1, f.t + dt / 0.7);
          var e = 1 - Math.pow(1 - f.t, 3);
          var fx = f.x0 + (dest.x - f.x0) * e;
          var fy = f.y0 + (dest.y - f.y0) * e - Math.sin(Math.PI * f.t) * H * 0.15;
          var fs = f.s0 + (dest.s - f.s0) * e;
          ctx.drawImage(S.emojis[f.e], fx - fs / 2, fy - fs / 2, fs, fs);
          if (f.t >= 1) { flyers.splice(m, 1); landed(f); }
        }
      });
    }
  });
})();
