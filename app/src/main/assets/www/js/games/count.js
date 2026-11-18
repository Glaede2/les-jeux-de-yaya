/*
 * Compter : des objets apparaissent (3 pommes, 5 canards…). On les touche un par un :
 * chacun saute et la voix compte « un, deux, trois ». Puis on touche le bon chiffre
 * parmi trois grosses cartes (chaque carte montre le chiffre ET autant de points).
 * Jamais d'échec : une mauvaise carte se dandine et la voix recompte avec l'enfant.
 * 3 niveaux : jusqu'à 3, jusqu'à 5, jusqu'à 10.
 */
(function () {
  'use strict';

  var MOTS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix'];
  var MOTS_F = MOTS.slice();
  MOTS_F[1] = 'une';

  // f : féminin (« une pomme »)
  var THINGS = [
    { e: '🍎', un: 'pomme', des: 'pommes', f: true },
    { e: '⭐', un: 'étoile', des: 'étoiles', f: true },
    { e: '🦆', un: 'canard', des: 'canards' },
    { e: '🎈', un: 'ballon', des: 'ballons' },
    { e: '🌸', un: 'fleur', des: 'fleurs', f: true },
    { e: '🐟', un: 'poisson', des: 'poissons' },
    { e: '🚗', un: 'voiture', des: 'voitures', f: true },
    { e: '🍓', un: 'fraise', des: 'fraises', f: true },
    { e: '🦋', un: 'papillon', des: 'papillons' },
    { e: '🐞', un: 'coccinelle', des: 'coccinelles', f: true },
    { e: '🍌', un: 'banane', des: 'bananes', f: true },
    { e: '🐣', un: 'poussin', des: 'poussins' }
  ];
  var NUM_COLORS = ['#ff5d8f', '#ff924c', '#ffb703', '#8ac926', '#4cc9a0', '#4cc9f0', '#5e7bff', '#9b5de5', '#ff6fb5', '#e85d75'];

  // max : plus grand nombre ; cols/rows : dessin du bouton de niveau
  var LEVELS = [
    { max: 3, cols: 3, rows: 1 },
    { max: 5, cols: 5, rows: 1 },
    { max: 10, cols: 5, rows: 2 }
  ];

  function word(n, thing) { return (thing.f ? MOTS_F : MOTS)[n]; }
  function phrase(n, thing) { return word(n, thing) + ' ' + (n > 1 ? thing.des : thing.un); }

  App.register({
    id: 'count',
    name: 'Compter',
    icon: '🔢',
    color: '#f4b400',
    start: function (kit) {
      var h = App.h;
      var wrap = h('div', 'count', kit.root);
      var bar = h('div', 'bar', wrap);
      var field = h('div', 'count-field', wrap);
      var answers = h('div', 'count-answers', wrap);
      var levelIdx = Math.min(Store.getSetting('count.level', 0), LEVELS.length - 1);
      var round = 0, n = 0, thing = null, counted = 0, items = [], done = false, lastN = 0, busy = false;

      App.levelPicker(bar, '🔢', LEVELS, levelIdx, function (i) {
        levelIdx = i;
        Store.setSetting('count.level', i);
        newRound();
      });

      // Minuteur lié à la manche en cours (ignoré si on a changé de manche entre-temps)
      function later(fn, ms) {
        var id = round;
        return kit.later(function () { if (id === round) fn(); }, ms);
      }

      // Points rangés comme sur un dé (1 à 5), puis deux rangées (6 à 10)
      function dots(parent, k, color) {
        var box = h('div', 'dots n' + k, parent);
        for (var i = 0; i < k; i++) h('i', null, box).style.background = color;
        return box;
      }

      // Positions des objets : une ou deux rangées bien espacées, avec un léger désordre
      function layout(k) {
        var rows = k <= 5 ? 1 : 2;
        var per = Math.ceil(k / rows);
        var pos = [];
        for (var i = 0; i < k; i++) {
          var r = Math.floor(i / per), c = i % per;
          var inRow = r === rows - 1 ? k - per * (rows - 1) : per;
          var x = (c + 0.5) / inRow * 100;
          var y = rows === 1 ? 50 : (r === 0 ? 28 : 72);
          pos.push({ x: x + App.rand(-3, 3), y: y + App.rand(-5, 5) });
        }
        return pos;
      }

      function newRound() {
        round++;
        done = false;
        busy = false;
        counted = 0;
        var lv = LEVELS[levelIdx];
        do { n = 1 + Math.floor(Math.random() * lv.max); } while (n === lastN && lv.max > 1);
        lastN = n;
        thing = App.pick(THINGS);
        field.innerHTML = '';
        answers.innerHTML = '';
        var size = n <= 3 ? 22 : n <= 5 ? 18 : 14;
        field.style.setProperty('--s', size + 'vh');
        items = layout(n).map(function (p, i) {
          var el = h('button', 'count-item', field);
          h('span', 'e', el, thing.e);
          el.style.left = p.x + '%';
          el.style.top = p.y + '%';
          el.style.animationDelay = (i * 0.08) + 's';
          var it = { el: el, num: 0 };
          el.addEventListener('pointerdown', function () { tapItem(it); });
          return it;
        });

        // Trois choix : la bonne réponse et deux voisines, dans le désordre
        var choices = [n];
        var cand = [];
        for (var d = 1; d <= lv.max; d++) if (d !== n) cand.push(d);
        cand.sort(function (a, b) { return Math.abs(a - n) - Math.abs(b - n) || Math.random() - 0.5; });
        choices = App.shuffle(choices.concat(cand.slice(0, Math.min(2, cand.length))));
        choices.forEach(function (k) {
          var b = h('button', 'count-card', answers);
          var color = NUM_COLORS[(k - 1) % NUM_COLORS.length];
          b.style.setProperty('--c', color);
          h('div', 'digit', b, String(k));
          dots(b, k, color);
          b.addEventListener('pointerdown', function () { choose(b, k); });
        });

        later(function () { App.say('Combien ' + (/^[aeéiouy]/.test(thing.des) ? "d'" : 'de ') + thing.des + ' ?'); }, 300);
      }

      // Toucher un objet : il saute, reçoit son numéro, la voix compte
      function tapItem(it) {
        if (done || busy) return;
        if (it.num) { App.bounce(it.el); App.say(word(it.num, thing)); return; }
        counted++;
        it.num = counted;
        it.el.classList.add('counted');
        var badge = h('span', 'badge', it.el, String(counted));
        badge.style.background = NUM_COLORS[(counted - 1) % NUM_COLORS.length];
        App.bounce(it.el);
        App.Sfx.note(392 * Math.pow(2, (counted - 1) / 7));
        App.say(word(counted, thing));
        if (counted === n) {
          later(function () { App.say(phrase(n, thing) + ' !'); }, 700);
        }
      }

      // La voix recompte tous les objets, un par un (après une mauvaise carte)
      function countAlong(then) {
        busy = true;
        items.forEach(function (it) {
          it.num = 0;
          it.el.classList.remove('counted');
          var b = it.el.querySelector('.badge');
          if (b) b.remove();
        });
        counted = 0;
        items.forEach(function (it, i) {
          later(function () {
            counted = i + 1;
            it.num = counted;
            it.el.classList.add('counted');
            h('span', 'badge', it.el, String(counted)).style.background = NUM_COLORS[i % NUM_COLORS.length];
            App.bounce(it.el);
            App.Sfx.note(392 * Math.pow(2, i / 7));
            App.say(word(counted, thing));
          }, 300 + i * 750);
        });
        later(function () {
          App.say(phrase(n, thing) + ' !');
          busy = false;
          if (then) then();
        }, 300 + n * 750 + 200);
      }

      function choose(card, k) {
        if (done || busy) return;
        App.bounce(card);
        if (k === n) {
          done = true;
          card.classList.add('good');
          Array.prototype.forEach.call(answers.children, function (c) { if (c !== card) c.classList.add('fade'); });
          items.forEach(function (it, i) {
            later(function () { it.el.classList.add('dance'); }, i * 60);
          });
          App.Sfx.success();
          App.confetti(70);
          App.say('Oui ! ' + phrase(n, thing) + ' ! Bravo !');
          later(newRound, 3600);
        } else {
          card.classList.remove('wiggle');
          void card.offsetWidth;
          card.classList.add('wiggle');
          App.Sfx.soft();
          App.say('Comptons ensemble !');
          later(function () { countAlong(); }, 1100);
        }
      }

      newRound();
    }
  });
})();
