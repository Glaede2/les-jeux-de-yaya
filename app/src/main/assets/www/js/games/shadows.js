/*
 * Les ombres : en haut, les ombres de quelques animaux ou objets ; en bas, les vrais.
 * On fait glisser chacun sur son ombre (ou on le touche, puis on touche l'ombre).
 * Quand il est à sa place il reprend ses couleurs, et les animaux poussent leur cri.
 * 3 niveaux : 2, 3 ou 4 ombres. Jamais d'échec : un mauvais essai revient doucement.
 *
 * Les ombres ne sont pas des images : c'est l'emoji lui-même, en couleur transparente
 * avec une ombre portée unie (text-shadow), ce qui donne une silhouette parfaite.
 */
(function () {
  'use strict';

  // snd : cri d'animal (voir animals.js)
  var THINGS = [
    { e: '🐘', nom: "l'éléphant", snd: 'elephant' },
    { e: '🦒', nom: 'la girafe' },
    { e: '🐢', nom: 'la tortue' },
    { e: '🐌', nom: "l'escargot" },
    { e: '🦀', nom: 'le crabe' },
    { e: '🐇', nom: 'le lapin' },
    { e: '🐓', nom: 'le coq', snd: 'coq' },
    { e: '🐄', nom: 'la vache', snd: 'vache' },
    { e: '🐖', nom: 'le cochon', snd: 'cochon' },
    { e: '🐎', nom: 'le cheval', snd: 'cheval' },
    { e: '🦆', nom: 'le canard', snd: 'canard' },
    { e: '🐈', nom: 'le chat', snd: 'chat' },
    { e: '🐕', nom: 'le chien', snd: 'chien' },
    { e: '🦋', nom: 'le papillon' },
    { e: '🐳', nom: 'la baleine', snd: 'baleine' },
    { e: '🐫', nom: 'le chameau', snd: 'chameau' },
    { e: '🐧', nom: 'le pingouin', snd: 'manchot' },
    { e: '🦌', nom: 'le cerf', snd: 'cerf' },
    { e: '🦜', nom: 'le perroquet', snd: 'perroquet' },
    { e: '🚗', nom: 'la voiture' },
    { e: '✈️', nom: "l'avion" },
    { e: '🚲', nom: 'le vélo' },
    { e: '⛵', nom: 'le bateau' },
    { e: '🚀', nom: 'la fusée' },
    { e: '☂️', nom: 'le parapluie' },
    { e: '🔑', nom: 'la clé' },
    { e: '🍌', nom: 'la banane' },
    { e: '🍐', nom: 'la poire' },
    { e: '🥕', nom: 'la carotte' },
    { e: '🎸', nom: 'la guitare' },
    { e: '⭐', nom: "l'étoile" }
  ];
  var LEVELS = [
    { k: 2, cols: 2, rows: 1 },
    { k: 3, cols: 3, rows: 1 },
    { k: 4, cols: 4, rows: 1 }
  ];
  var BG = ['#fff3c4', '#dff6ff', '#e9ffe6', '#ffe5ec', '#efe7ff'];

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  App.lines(['À qui sont ces ombres ?'].concat(THINGS.map(function (t) { return cap(t.nom) + ' !'; })));

  App.register({
    id: 'shadows',
    name: 'Ombres',
    icon: '🦒',
    iconClass: 'shadow-icon',
    color: '#9b5de5',
    start: function (kit) {
      var h = App.h;
      var wrap = h('div', 'shadows', kit.root);
      var bar = h('div', 'bar', wrap);
      var top = h('div', 'sh-row sh-top', wrap);
      var bottom = h('div', 'sh-row sh-bottom', wrap);
      var levelIdx = Math.min(Store.getSetting('shadows.level', 0), LEVELS.length - 1);
      var round = 0, slots = [], pieces = [], left = 0, selected = null, drag = null, lastSet = [];

      App.levelPicker(bar, '🦒', LEVELS, levelIdx, function (i) {
        levelIdx = i;
        Store.setSetting('shadows.level', i);
        newRound();
      });

      function later(fn, ms) {
        var id = round;
        kit.later(function () { if (id === round) fn(); }, ms);
      }

      function newRound() {
        round++;
        selected = null;
        drag = null;
        var k = LEVELS[levelIdx].k;
        // pas deux fois les mêmes de suite
        var pool = App.shuffle(THINGS.filter(function (t) { return lastSet.indexOf(t) < 0; }));
        var set = pool.slice(0, k);
        lastSet = set;
        left = k;
        wrap.style.background = App.pick(BG);
        wrap.style.setProperty('--s', (k <= 2 ? 26 : k === 3 ? 23 : 19) + 'vh');
        top.innerHTML = '';
        bottom.innerHTML = '';
        slots = set.map(function (t) {
          var el = h('div', 'sh-slot', top);
          h('span', 'e', el, t.e);
          var slot = { el: el, t: t, done: false };
          el.addEventListener('pointerdown', function () { tapSlot(slot); });
          return slot;
        });
        pieces = App.shuffle(set.slice()).map(function (t, i) {
          var el = h('div', 'sh-piece', bottom);
          h('span', 'e', el, t.e);
          el.style.animationDelay = (i * 0.1) + 's';
          var p = { el: el, t: t, done: false };
          el.addEventListener('pointerdown', function (e) { grab(p, e); });
          return p;
        });
        later(function () { App.say('À qui sont ces ombres ?'); }, 250);
      }

      // ---- Glisser-déposer (avec un repli « toucher puis toucher l'ombre »)
      function grab(p, e) {
        if (p.done) return;
        e.preventDefault();
        if (p.el.setPointerCapture) { try { p.el.setPointerCapture(e.pointerId); } catch (err) { /* rien */ } }
        drag = { p: p, id: e.pointerId, x0: e.clientX, y0: e.clientY, moved: false };
        p.el.classList.add('lifted');
        App.Sfx.tap();
      }

      kit.on(window, 'pointermove', function (e) {
        if (!drag || e.pointerId !== drag.id) return;
        var dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
        if (!drag.moved && dx * dx + dy * dy > 144) drag.moved = true;
        if (drag.moved) drag.p.el.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(1.12)';
      });

      function release(e) {
        if (!drag || e.pointerId !== drag.id) return;
        var d = drag;
        drag = null;
        if (!d.moved) { // simple toucher : on sélectionne
          select(d.p);
          return;
        }
        var slot = slotAt(e.clientX, e.clientY);
        if (slot && slot.t === d.p.t) place(d.p, slot);
        else {
          if (slot) { App.Sfx.soft(); shake(slot.el); }
          home(d.p);
        }
      }
      kit.on(window, 'pointerup', release);
      kit.on(window, 'pointercancel', release);

      function slotAt(x, y) {
        var best = null, bestD = Infinity;
        slots.forEach(function (s) {
          if (s.done) return;
          var r = s.el.getBoundingClientRect();
          var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
          var dd = Math.hypot(x - cx, y - cy);
          if (dd < r.width * 0.75 && dd < bestD) { best = s; bestD = dd; }
        });
        return best;
      }

      function home(p) {
        p.el.classList.remove('lifted');
        p.el.classList.add('back');
        p.el.style.transform = '';
        kit.later(function () { p.el.classList.remove('back'); }, 350);
      }

      function shake(el) {
        el.classList.remove('wiggle');
        void el.offsetWidth;
        el.classList.add('wiggle');
      }

      function select(p) {
        if (selected && selected !== p) selected.el.classList.remove('lifted', 'picked');
        selected = p;
        p.el.style.transform = '';
        p.el.classList.add('lifted', 'picked');
        slots.forEach(function (s) { if (!s.done) App.bounce(s.el); });
      }

      function tapSlot(slot) {
        if (slot.done) return;
        if (!selected) { App.bounce(slot.el); App.Sfx.tap(); return; }
        var p = selected;
        selected = null;
        p.el.classList.remove('picked');
        if (p.t === slot.t) place(p, slot);
        else { App.Sfx.soft(); shake(slot.el); home(p); }
      }

      // ---- Bonne place : la pièce vole jusqu'à son ombre, qui reprend ses couleurs
      function place(p, slot) {
        p.done = slot.done = true;
        var a = p.el.getBoundingClientRect(), b = slot.el.getBoundingClientRect();
        var cur = p.el.style.transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
        var ox = cur ? +cur[1] : 0, oy = cur ? +cur[2] : 0;
        var dx = ox + (b.left + b.width / 2) - (a.left + a.width / 2);
        var dy = oy + (b.top + b.height / 2) - (a.top + a.height / 2);
        p.el.classList.remove('lifted', 'picked');
        p.el.classList.add('fly');
        p.el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
        App.Sfx.snap();
        later(function () {
          p.el.classList.add('gone');
          slot.el.classList.add('filled');
          App.bounce(slot.el);
          left--;
          var last = !left;
          var crying = slot.t.snd && window.Animals ? Animals.cry(slot.t.snd) : Promise.resolve(0);
          crying.then(function (len) {
            if (len) later(function () { App.say(cap(slot.t.nom) + ' !'); }, len * 1000 + 100);
            else App.say(cap(slot.t.nom) + ' !');
            if (!last) return;
            later(function () {
              App.celebrate();
              slots.forEach(function (s, i) { later(function () { App.bounce(s.el); }, i * 120); });
            }, Math.max(1200, len * 1000 + 900));
            later(newRound, Math.max(4200, len * 1000 + 3900));
          });
        }, 380);
      }

      newRound();
    }
  });
})();
