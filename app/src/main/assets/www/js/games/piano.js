/*
 * Piano / xylophone : 8 grosses touches de couleur, une note chacune.
 * On peut glisser le doigt sur les touches, et le bouton ▶ joue
 * "Au clair de la lune" en allumant les touches.
 */
(function () {
  'use strict';

  var NOTES = [262, 294, 330, 349, 392, 440, 494, 523]; // do ré mi fa sol la si do
  var COLORS = ['#ff4d4d', '#ff9f1c', '#ffd23f', '#8ac926', '#2a9d8f', '#4cc9f0', '#3a86ff', '#9b5de5'];
  var FACES = ['🐭', '🐰', '🐻', '🐼', '🐯', '🦊', '🐨', '🐸'];
  var FLY = ['🎵', '🎶', '⭐', '💖'];

  // Au clair de la lune : [touche, durée]
  var SONG = [[0, 1], [0, 1], [0, 1], [1, 1], [2, 2], [1, 2], [0, 1], [2, 1], [1, 1], [1, 1], [0, 4]];

  App.register({
    id: 'piano',
    name: 'Piano',
    icon: '🎹',
    color: '#9b8cff',
    start: function (kit) {
      var h = App.h;
      var wrap = h('div', 'piano', kit.root);
      var bar = h('div', 'bar', wrap);
      var bPlay = h('button', 'round-btn', bar, '▶️');
      var keys = [], playing = false;

      NOTES.forEach(function (f, i) {
        var k = h('div', 'key', wrap, FACES[i]);
        k.style.background = COLORS[i];
        k.dataset.i = i;
        keys.push(k);
      });

      function play(i) {
        var k = keys[i];
        App.Sfx.note(NOTES[i]);
        k.classList.add('down');
        kit.later(function () { k.classList.remove('down'); }, 160);
        // une note qui s'envole
        var r = k.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
        var n = h('div', 'flying-note', wrap, App.pick(FLY));
        n.style.left = (r.left - wr.left + r.width / 2 - r.width * 0.25) + 'px';
        n.style.top = (r.top - wr.top + r.height * 0.4) + 'px';
        kit.later(function () { n.remove(); }, 1200);
      }

      // Plusieurs doigts + glissé d'une touche à l'autre
      var fingers = {};
      function keyAt(e) {
        var el = document.elementFromPoint(e.clientX, e.clientY);
        return el && el.classList.contains('key') ? +el.dataset.i : -1;
      }
      kit.on(wrap, 'pointerdown', function (e) {
        var i = keyAt(e);
        fingers[e.pointerId] = i;
        if (i >= 0) play(i);
      });
      kit.on(wrap, 'pointermove', function (e) {
        if (!(e.pointerId in fingers)) return;
        var i = keyAt(e);
        if (i >= 0 && i !== fingers[e.pointerId]) play(i);
        fingers[e.pointerId] = i;
      });
      function up(e) { delete fingers[e.pointerId]; }
      kit.on(wrap, 'pointerup', up);
      kit.on(wrap, 'pointercancel', up);

      // Le bouton ▶ joue la comptine
      kit.on(bPlay, 'pointerdown', function (e) {
        e.stopPropagation();
        if (playing) return;
        playing = true;
        App.bounce(bPlay);
        var t = 0;
        SONG.forEach(function (n) {
          kit.later(function () { play(n[0]); }, t);
          t += n[1] * 380;
        });
        kit.later(function () { playing = false; }, t);
      });

      App.say('Joue de la musique !');
    }
  });
})();
