/*
 * Les jeux de Yaya — noyau commun.
 * Navigation menu <-> jeux, petits sons synthétisés, sons enregistrés (cris des animaux),
 * voix (synthèse vocale Android), confettis, utilitaires canvas.
 *
 * Chaque jeu s'enregistre avec App.register({ id, name, icon, color, start(kit) }).
 * Le "kit" nettoie automatiquement écouteurs, minuteurs et boucles quand on quitte le jeu.
 */
var App = (function () {
  'use strict';

  // ---------------------------------------------------------------- Sons
  var actx = null;
  function audio() {
    if (!actx) {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      actx = new C();
    }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }

  function tone(freq, dur, o) {
    var a = audio();
    if (!a) return;
    o = o || {};
    var t = a.currentTime + (o.delay || 0);
    var osc = a.createOscillator();
    var g = a.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t + dur);
    var v = o.vol == null ? 0.3 : o.vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(a.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  // Sons enregistrés (fichiers dans sounds/) : décodés une seule fois puis gardés en mémoire
  var buffers = {}, channels = {};
  function loadSample(url) {
    if (!buffers[url]) {
      buffers[url] = fetch(url)
        .then(function (r) { if (!r.ok) throw new Error(url); return r.arrayBuffer(); })
        .then(function (data) {
          return new Promise(function (ok, ko) { audio().decodeAudioData(data, ok, ko); });
        });
      buffers[url].catch(function () { delete buffers[url]; });
    }
    return buffers[url];
  }

  // Joue un son enregistré. Sur un même canal, le son précédent s'arrête en douceur.
  // Renvoie une promesse de la durée du son (s).
  function sample(url, channel) {
    var a = audio();
    if (!a) return Promise.resolve(0);
    return loadSample(url).then(function (buf) {
      var now = a.currentTime;
      var old = channel && channels[channel];
      if (old) {
        old.gain.setValueAtTime(old.gain.value, now);
        old.gain.linearRampToValueAtTime(0, now + 0.08);
      }
      var g = a.createGain();
      g.connect(a.destination);
      var src = a.createBufferSource();
      src.buffer = buf;
      src.connect(g);
      src.start(now + 0.01);
      if (channel) channels[channel] = g;
      return buf.duration;
    }, function () { return 0; });
  }

  var Sfx = {
    ctx: audio, // contexte audio, pour les jeux qui fabriquent leurs propres sons
    sample: sample,
    preload: function (url) { if (audio()) loadSample(url); },
    tone: tone,
    tap: function () { tone(660, 0.08, { type: 'triangle', vol: 0.2 }); },
    pop: function (p) { p = p || 1; tone(420 * p, 0.12, { slide: 1300 * p, vol: 0.35 }); },
    plop: function (p) { p = p || 1; tone(260 * p, 0.16, { slide: 620 * p, vol: 0.3 }); },
    snap: function () {
      tone(880, 0.07, { type: 'square', vol: 0.08 });
      tone(1320, 0.14, { type: 'triangle', vol: 0.22, delay: 0.06 });
    },
    soft: function () { // "raté", tout doux, jamais punitif
      tone(392, 0.15, { type: 'triangle', vol: 0.12 });
      tone(330, 0.2, { type: 'triangle', vol: 0.12, delay: 0.12 });
    },
    flip: function () { tone(1100, 0.07, { type: 'triangle', vol: 0.12, slide: 750 }); },
    success: function () {
      [523, 659, 784, 1047].forEach(function (f, i) {
        tone(f, 0.28, { type: 'triangle', vol: 0.22, delay: i * 0.11 });
      });
    },
    note: function (f) { // petit xylophone
      tone(f, 1.0, { vol: 0.35 });
      tone(f * 2, 0.45, { vol: 0.07 });
      tone(f * 4, 0.12, { type: 'triangle', vol: 0.04 });
    }
  };

  // ---------------------------------------------------------------- Voix
  // Voix du narrateur ; désactivable dans l'espace parents (les sons des jeux restent).
  // Les phrases connues sont préenregistrées (voice/*.mp3, liste dans js/voice-index.js,
  // générées par tools/voices.mjs). Les autres (noms donnés par les parents) passent
  // par la synthèse vocale de la tablette.
  var lines = [];
  function addLines(list) { lines = lines.concat(list); }
  function allLines() {
    var seen = {};
    return lines.filter(function (t) { if (seen[t]) return false; seen[t] = true; return true; });
  }

  function say(text) {
    if (window.Store && !Store.getSetting('voice', true)) return;
    var file = window.VOICE && VOICE[text];
    if (file) {
      if (window.speechSynthesis) speechSynthesis.cancel();
      sample('voice/' + file + '.mp3', 'voice');
      return;
    }
    try {
      if (window.AndroidBridge && window.AndroidBridge.speak) {
        window.AndroidBridge.speak(text);
      } else if (window.speechSynthesis) { // test sur PC
        speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(text);
        u.lang = 'fr-FR';
        u.rate = 0.95;
        u.pitch = 1.15;
        speechSynthesis.speak(u);
      }
    } catch (e) { /* pas de voix : tant pis */ }
  }

  // ---------------------------------------------------------------- Utilitaires
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function h(tag, cls, parent, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }

  // Densité limitée à 1.5 : beaucoup moins de pixels à dessiner sur une petite tablette
  function fitCanvas(canvas) {
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var r = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
    return { w: r.width, h: r.height, dpr: dpr };
  }

  function localPos(e, el) {
    var r = el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function bounce(el) {
    el.classList.remove('bounce');
    void el.offsetWidth; // relance l'animation
    el.classList.add('bounce');
  }

  // ---------------------------------------------------------------- Choix de difficulté
  // Pas de chiffres (elle ne lit pas) : chaque bouton montre une petite grille
  // de cases, du vert (facile) au rouge (dur). levels = [{ cols, rows }, ...]
  var LEVEL_COLORS = ['#8ac926', '#ffca3a', '#ff924c', '#ff595e'];

  function levelPicker(parent, icon, levels, current, onPick) {
    var box = h('div', 'chips', parent);
    h('span', 'chips-icon', box, icon);
    var btns = levels.map(function (lv, i) {
      var b = h('button', 'chip' + (i === current ? ' on' : ''), box);
      var mini = h('div', 'mini', b);
      mini.style.gridTemplateColumns = 'repeat(' + lv.cols + ', 1fr)';
      mini.style.gridTemplateRows = 'repeat(' + lv.rows + ', 1fr)';
      for (var k = 0; k < lv.cols * lv.rows; k++) {
        h('span', null, mini).style.background = LEVEL_COLORS[i % LEVEL_COLORS.length];
      }
      b.addEventListener('pointerdown', function () {
        if (b.classList.contains('on')) return;
        btns.forEach(function (x) { x.classList.toggle('on', x === b); });
        Sfx.tap();
        onPick(i);
      });
      return b;
    });
    return box;
  }

  // ---------------------------------------------------------------- Confettis
  var fx, fxCtx, parts = [], fxRunning = false;
  var CONFETTI = ['#ff6f91', '#ffc75f', '#4cd3c2', '#845ec2', '#59b2ff', '#9be15d'];

  function confetti(n) {
    var w = window.innerWidth, hh = window.innerHeight;
    if (fx.width !== w || fx.height !== hh) { fx.width = w; fx.height = hh; }
    for (var i = 0; i < n; i++) {
      parts.push({
        x: w / 2 + rand(-w * 0.15, w * 0.15), y: hh * 0.55,
        vx: rand(-420, 420), vy: rand(-900, -350),
        s: rand(8, 16), r: rand(0, 6), vr: rand(-8, 8),
        c: pick(CONFETTI), life: rand(1.6, 2.4)
      });
    }
    if (!fxRunning) {
      fxRunning = true;
      var last = performance.now();
      requestAnimationFrame(function step(now) {
        var dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
        last = now;
        fxCtx.clearRect(0, 0, fx.width, fx.height);
        for (var i = parts.length - 1; i >= 0; i--) {
          var p = parts[i];
          p.life -= dt;
          if (p.life <= 0 || p.y > hh + 30) { parts.splice(i, 1); continue; }
          p.vy += 1100 * dt;
          p.vx *= 0.99;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.r += p.vr * dt;
          fxCtx.save();
          fxCtx.translate(p.x, p.y);
          fxCtx.rotate(p.r);
          fxCtx.fillStyle = p.c;
          fxCtx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
          fxCtx.restore();
        }
        if (parts.length) requestAnimationFrame(step);
        else { fxRunning = false; fxCtx.clearRect(0, 0, fx.width, fx.height); }
      });
    }
  }

  var PRAISE = ['Bravo !', 'Super !', 'Génial !', 'Trop fort !', 'Youpi !'];
  addLines(PRAISE.concat(['Yaya !', 'Coucou Yaya ! On va bien s\'amuser !']));

  function celebrate(words) {
    Sfx.success();
    say(words || pick(PRAISE));
    confetti(90);
  }

  // ---------------------------------------------------------------- Kit de jeu
  function makeKit(root) {
    var offs = [], timers = [], raf = 0, alive = true;
    return {
      root: root,
      alive: function () { return alive; },
      on: function (target, type, fn, opts) {
        target.addEventListener(type, fn, opts);
        offs.push(function () { target.removeEventListener(type, fn, opts); });
      },
      later: function (fn, ms) {
        var id = setTimeout(function () { if (alive) fn(); }, ms);
        timers.push(id);
        return id;
      },
      // Boucle d'animation ; fn(dt, now) renvoie false pour s'arrêter
      loop: function (fn) {
        cancelAnimationFrame(raf);
        var last = performance.now();
        raf = requestAnimationFrame(function step(now) {
          if (!alive) return;
          // l'horodatage de la 1re image peut précéder performance.now()
          var dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
          last = now;
          if (fn(dt, now) === false) return;
          raf = requestAnimationFrame(step);
        });
      },
      dispose: function () {
        alive = false;
        offs.forEach(function (f) { f(); });
        timers.forEach(clearTimeout);
        cancelAnimationFrame(raf);
      }
    };
  }

  // ---------------------------------------------------------------- Navigation
  var games = [];
  var current = null; // { kit, cleanup }
  var menuEl, gameEl, rootEl;

  function register(def) { games.push(def); }

  function openGame(def) {
    closeGame();
    menuEl.classList.add('hidden');
    gameEl.classList.remove('hidden');
    rootEl.innerHTML = '';
    var kit = makeKit(rootEl);
    var cleanup = def.start(kit);
    current = { kit: kit, cleanup: cleanup };
  }

  function closeGame() {
    if (!current) return;
    current.kit.dispose();
    if (typeof current.cleanup === 'function') current.cleanup();
    current = null;
    rootEl.innerHTML = '';
  }

  function showMenu() {
    closeGame();
    gameEl.classList.add('hidden');
    menuEl.classList.remove('hidden');
  }

  // Appelé par le bouton retour Android : dans un jeu ou l'espace parents -> menu, dans le menu -> rien
  function back() {
    if (window.Admin && Admin.isOpen()) { Admin.close(); return true; }
    if (current) { Sfx.tap(); showMenu(); return true; }
    return false;
  }

  // Le prénom affiché en haut du menu : chaque lettre a sa couleur et joue une note
  var NAME = 'Yaya';
  var NAME_COLORS = ['#ff5d8f', '#ffb703', '#4cc9a0', '#4cc9f0', '#9b5de5', '#ff924c'];
  var NAME_NOTES = [523, 659, 784, 1047, 880, 698];

  function buildTitle() {
    var title = document.getElementById('title');
    var lastSaid = 0;
    NAME.split('').forEach(function (ch, i) {
      var l = h('span', 'letter', title, ch);
      l.style.setProperty('--c', NAME_COLORS[i % NAME_COLORS.length]);
      l.style.setProperty('--i', i);
      l.addEventListener('pointerdown', function () {
        Sfx.note(NAME_NOTES[i % NAME_NOTES.length]);
        l.classList.remove('pop');
        void l.offsetWidth;
        l.classList.add('pop');
        setTimeout(function () { l.classList.remove('pop'); }, 500);
        if (Date.now() - lastSaid > 2500) { lastSaid = Date.now(); say(NAME + ' !'); }
      });
    });
  }

  // Les parents peuvent masquer des jeux (espace parents > Réglages)
  function isShown(def) { return !window.Store || Store.getSetting('game.' + def.id, true); }

  function buildMenu() {
    buildTitle();
    renderTiles();
  }

  function renderTiles() {
    var tiles = document.getElementById('tiles');
    tiles.innerHTML = '';
    var shown = games.filter(isShown);
    if (!shown.length) shown = games; // jamais de menu vide
    var cols = shown.length <= 3 ? shown.length : shown.length <= 6 ? 3 : 4;
    tiles.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
    tiles.className = shown.length > 8 ? 'small' : '';
    shown.forEach(function (def, i) {
      var t = h('button', 'tile', tiles);
      t.style.setProperty('--i', i);
      var body = h('div', 'tile-body', t);
      body.style.setProperty('--c', def.color);
      h('div', 'icon' + (def.iconClass ? ' ' + def.iconClass : ''), h('div', 'icon-wrap', body), def.icon);
      h('div', 'label', body, def.name);
      t.addEventListener('pointerdown', function () {
        Sfx.tap();
        t.classList.add('pressed');
        setTimeout(function () { t.classList.remove('pressed'); openGame(def); }, 140);
      });
    });
  }

  // Petite bulle d'explication pour les parents (l'enfant, lui, ne lit pas)
  var tipEl = null, tipTimer = 0;
  function tip(text, side) {
    if (!tipEl) tipEl = h('div', 'parent-tip', document.getElementById('menu'));
    tipEl.textContent = text;
    tipEl.className = 'parent-tip show ' + side;
    clearTimeout(tipTimer);
    tipTimer = setTimeout(function () { tipEl.classList.remove('show'); }, 3500);
  }

  // Boutons réservés aux parents : il faut les maintenir 3 secondes.
  // Un appui trop court affiche une bulle qui explique quoi faire.
  function holdButton(el, fn, hint, side) {
    var timer = 0, t0 = 0;
    function cancel() {
      clearTimeout(timer);
      el.classList.remove('holding');
    }
    el.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      t0 = Date.now();
      el.classList.add('holding');
      timer = setTimeout(function () { t0 = 0; cancel(); fn(); }, 3000);
    });
    el.addEventListener('pointerup', function () {
      if (t0 && Date.now() - t0 < 2900) tip(hint, side);
      t0 = 0;
      cancel();
    });
    el.addEventListener('pointerleave', cancel);
    el.addEventListener('pointercancel', cancel);
  }

  function setupParentButtons() {
    holdButton(document.getElementById('lock'), function () {
      if (window.AndroidBridge && window.AndroidBridge.exit) window.AndroidBridge.exit();
      else alert('Sortie (sur la tablette, l\'appli se ferme ici)');
    }, 'Pour quitter l\'appli : garde le doigt appuyé sur 🔒 pendant 3 secondes.', 'right');
    holdButton(document.getElementById('gear'), function () { Admin.open(); },
      'Espace parents : garde le doigt appuyé sur ⚙️ pendant 3 secondes.', 'left');
  }

  function boot() {
    menuEl = document.getElementById('menu');
    gameEl = document.getElementById('game');
    rootEl = document.getElementById('game-root');
    fx = document.getElementById('fx');
    fxCtx = fx.getContext('2d');

    buildMenu();
    setupParentButtons();
    document.getElementById('home').addEventListener('pointerdown', function () {
      Sfx.tap();
      showMenu();
    });
    // Pas de menu contextuel sur appui long
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    // Le son ne peut démarrer qu'après un premier contact
    document.addEventListener('pointerdown', audio, { once: true });

    // Test sur PC : touche Échap = bouton retour
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') back(); });

    // Test sur PC : index.html#puzzle ouvre directement un jeu (sert aux captures du site)
    var direct = location.hash.slice(1);
    games.forEach(function (def) { if (def.id === direct) openGame(def); });
  }

  // Appelés par l'activité Android
  function pause() { if (actx) actx.suspend(); }
  function resume() { /* le son reprend au prochain contact */ }

  return {
    register: register, boot: boot, back: back, pause: pause, resume: resume,
    games: function () { return games.slice(); }, refreshMenu: renderTiles,
    Sfx: Sfx, say: say, celebrate: celebrate, confetti: confetti, lines: addLines, allLines: allLines,
    h: h, pick: pick, rand: rand, shuffle: shuffle,
    fitCanvas: fitCanvas, localPos: localPos, bounce: bounce, levelPicker: levelPicker
  };
})();
