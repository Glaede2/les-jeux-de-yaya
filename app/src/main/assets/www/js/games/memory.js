/*
 * Memory : retrouver les paires d'animaux (ou des photos ajoutées par les parents).
 * 4 niveaux (2, 4, 6 ou 8 paires) choisis avec les boutons en haut ; le choix est mémorisé.
 * Au début de chaque partie les cartes se montrent un instant pour aider à mémoriser.
 */
(function () {
  'use strict';

  var CARDS = [
    { e: '🐶', nom: 'le chien' }, { e: '🐱', nom: 'le chat' }, { e: '🐰', nom: 'le lapin' },
    { e: '🦁', nom: 'le lion' }, { e: '🐸', nom: 'la grenouille' }, { e: '🐷', nom: 'le cochon' },
    { e: '🐵', nom: 'le singe' }, { e: '🐼', nom: 'le panda' }, { e: '🐤', nom: 'le poussin' },
    { e: '🦋', nom: 'le papillon' }
  ];
  App.lines(['Retrouve les paires !']);
  CARDS.forEach(function (c) { App.lines([c.nom.charAt(0).toUpperCase() + c.nom.slice(1) + ' !']); });

  var LEVELS = [
    { pairs: 2, cols: 4, rows: 1 },
    { pairs: 4, cols: 4, rows: 2 },
    { pairs: 6, cols: 6, rows: 2 },
    { pairs: 8, cols: 8, rows: 2 }
  ];

  App.register({
    id: 'memory',
    name: 'Memory',
    icon: '🃏',
    color: '#4cc9a0',
    start: function (kit) {
      var h = App.h;
      var wrap = h('div', 'memory', kit.root);
      var bar = h('div', 'bar', wrap);
      var grid = h('div', 'grid', wrap);
      var levelIdx = Math.min(Store.getSetting('memory.level', 0), LEVELS.length - 1);
      var open = [], lock = false, found = 0, cards = [], photos = [], gameId = 0;

      App.levelPicker(bar, '🃏', LEVELS, levelIdx, function (i) {
        levelIdx = i;
        Store.setSetting('memory.level', i);
        newGame();
      });

      // Minuteur lié à la partie en cours : ignoré si on a changé de niveau entre-temps
      function later(fn, ms) {
        var id = gameId;
        kit.later(function () { if (id === gameId) fn(); }, ms);
      }

      // Photos des parents : toutes les cartes si les animaux de base sont masqués,
      // sinon au moins la moitié. Les animaux complètent s'il n'y a pas assez de photos.
      function pickCards(pairs) {
        var ph = App.shuffle(photos.slice());
        var n = Store.showBuiltins('memory') ? Math.min(ph.length, Math.ceil(pairs / 2)) : pairs;
        var pool = ph.slice(0, n);
        var extra = App.shuffle(CARDS.slice());
        while (pool.length < pairs) pool.push(extra.pop());
        return App.shuffle(pool);
      }

      // Taille des cartes : la plus grande qui tient à l'écran pour ce niveau
      function sizeCards(lv) {
        var vh = window.innerHeight / 100, vw = window.innerWidth / 100;
        var gap = 2.5 * vh, availW = 92 * vw, availH = 80 * vh;
        var ch = Math.min(availH / lv.rows - gap, (availW / lv.cols - gap) * 32 / 26, 38 * vh);
        grid.style.setProperty('--ch', ch + 'px');
        grid.style.setProperty('--cw', (ch * 26 / 32) + 'px');
        grid.style.setProperty('--gap', gap + 'px');
        grid.style.gridTemplateColumns = 'repeat(' + lv.cols + ', auto)';
      }

      function newGame() {
        gameId++;
        var lv = LEVELS[levelIdx];
        var chosen = pickCards(lv.pairs);
        var deck = App.shuffle(chosen.concat(chosen));
        grid.innerHTML = '';
        sizeCards(lv);
        open = [];
        found = 0;
        lock = true;
        cards = deck.map(function (c) {
          var el = h('div', 'card open', grid);
          h('div', 'face back', el, '⭐');
          var front = h('div', 'face front', el, c.e || null);
          if (c.img) h('img', null, front).src = c.img;
          var card = { el: el, c: c, found: false };
          el.addEventListener('pointerdown', function () { tap(card); });
          return card;
        });
        // Aperçu : on montre tout (un peu plus longtemps s'il y a beaucoup de cartes), puis on retourne
        later(function () {
          cards.forEach(function (k) { k.el.classList.remove('open'); });
          App.Sfx.flip();
          lock = false;
        }, 1200 + lv.pairs * 250);
      }

      function tap(card) {
        if (lock || card.found || open.indexOf(card) >= 0) return;
        card.el.classList.add('open');
        App.Sfx.flip();
        open.push(card);
        if (open.length < 2) return;

        var a = open[0], b = open[1];
        open = [];
        if (a.c === b.c) {
          a.found = b.found = true;
          later(function () {
            a.el.classList.add('found');
            b.el.classList.add('found');
            App.bounce(a.el);
            App.bounce(b.el);
            App.Sfx.snap();
            if (a.c.nom) App.say(a.c.nom.charAt(0).toUpperCase() + a.c.nom.slice(1) + ' !');
          }, 350);
          found++;
          if (found === LEVELS[levelIdx].pairs) {
            later(function () { App.celebrate(); }, 900);
            later(newGame, 4000);
          }
        } else {
          lock = true;
          later(function () {
            a.el.classList.remove('open');
            b.el.classList.remove('open');
            App.Sfx.soft();
            lock = false;
          }, 1100);
        }
      }

      kit.on(window, 'resize', function () { sizeCards(LEVELS[levelIdx]); });
      App.say('Retrouve les paires !');
      Store.list('memory').then(function (items) {
        if (!kit.alive()) return;
        photos = items.map(function (it) { return { img: it.data, nom: it.name }; });
        newGame();
      });
    }
  });
})();
