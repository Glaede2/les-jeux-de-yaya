/*
 * Les cris des animaux : on touche un animal, il saute, on entend son vrai cri,
 * puis la voix dit son nom.
 *
 * Uniquement de vrais enregistrements (dossier sounds/, sources libres : voir sounds/CREDITS.txt).
 * Pour ajouter un animal : mettre sounds/<snd>.mp3 (+ crédit), l'ajouter dans PAGES,
 * puis relancer node tools/voices.mjs pour la phrase « C'est … ! ».
 */
(function () {
  'use strict';

  var PAGES = [
    {
      nom: 'La ferme',
      bg: 'linear-gradient(#bdefff 0%, #bdefff 55%, #9be15d 55%)',
      list: [
        { e: '🐮', cri: 'Meuh !', nom: 'la vache', snd: 'vache' },
        { e: '🐷', cri: 'Groin groin !', nom: 'le cochon', snd: 'cochon' },
        { e: '🐑', cri: 'Bêêê !', nom: 'le mouton', snd: 'mouton' },
        { e: '🐐', cri: 'Mêêê !', nom: 'la chèvre', snd: 'chevre' },
        { e: '🐴', cri: 'Hiii hiii !', nom: 'le cheval', snd: 'cheval' },
        { e: '🦃', cri: 'Glouglou !', nom: 'le dindon', snd: 'dindon' }
      ]
    },
    {
      nom: 'La basse-cour et la maison',
      bg: 'linear-gradient(#ffe5ec 0%, #ffe5ec 55%, #c7f9cc 55%)',
      list: [
        { e: '🐔', cri: 'Cot cot codet !', nom: 'la poule', snd: 'poule' },
        { e: '🐓', cri: 'Cocorico !', nom: 'le coq', snd: 'coq' },
        { e: '🐤', cri: 'Piou piou !', nom: 'le poussin', snd: 'poussin' },
        { e: '🦆', cri: 'Coin coin !', nom: 'le canard', snd: 'canard' },
        { e: '🐶', cri: 'Ouaf ouaf !', nom: 'le chien', snd: 'chien' },
        { e: '🐱', cri: 'Miaou !', nom: 'le chat', snd: 'chat' }
      ]
    },
    {
      nom: 'Le jardin',
      bg: 'linear-gradient(#fff3c4 0%, #fff3c4 55%, #b5e48c 55%)',
      list: [
        { e: '🐦', cri: 'Cui-cui !', nom: "l'oiseau", snd: 'oiseau' },
        { e: '🐝', cri: 'Bzzz !', nom: "l'abeille", snd: 'abeille' },
        { e: '🦗', cri: 'Cri-cri !', nom: 'le grillon', snd: 'grillon' },
        { e: '🐸', cri: 'Croâ croâ !', nom: 'la grenouille', snd: 'grenouille' },
        { e: '🐭', cri: 'Couic couic !', nom: 'la souris', snd: 'souris' }
      ]
    },
    {
      nom: 'La forêt',
      bg: 'linear-gradient(#b8e0d2 0%, #b8e0d2 55%, #74c69d 55%)',
      list: [
        { e: '🐺', cri: 'Aouuuh !', nom: 'le loup', snd: 'loup' },
        { e: '🐻', cri: 'Grrr !', nom: "l'ours", snd: 'ours' },
        { e: '🦌', cri: 'Bôôôh !', nom: 'le cerf', snd: 'cerf' },
        { e: '🦊', cri: 'Kaïïï !', nom: 'le renard', snd: 'renard' },
        { e: '🦉', cri: 'Hou hou !', nom: 'le hibou', snd: 'hibou' }
      ]
    },
    {
      nom: 'La savane',
      bg: 'linear-gradient(#ffd9a0 0%, #ffe8a3 55%, #e9c46a 55%)',
      list: [
        { e: '🦁', cri: 'Groaaar !', nom: 'le lion', snd: 'lion' },
        { e: '🐘', cri: 'Pouuuuh !', nom: "l'éléphant", snd: 'elephant' },
        { e: '🦛', cri: 'Hon hon !', nom: "l'hippopotame", snd: 'hippo' },
        { e: '🐫', cri: 'Blôôô !', nom: 'le chameau', snd: 'chameau' }
      ]
    },
    {
      nom: 'La jungle',
      bg: 'linear-gradient(#caffbf 0%, #caffbf 55%, #52b788 55%)',
      list: [
        { e: '🐯', cri: 'Grrraou !', nom: 'le tigre', snd: 'tigre' },
        { e: '🐵', cri: 'Hou hou ha ha !', nom: 'le singe', snd: 'singe' },
        { e: '🦍', cri: 'Grooaar !', nom: 'le gorille', snd: 'gorille' },
        { e: '🦜', cri: 'Crôa crôa !', nom: 'le perroquet', snd: 'perroquet' }
      ]
    },
    {
      nom: 'La mer et la banquise',
      bg: 'linear-gradient(#dff6ff 0%, #dff6ff 55%, #7ec4cf 55%)',
      list: [
        { e: '🐬', cri: 'Hiii clic clic !', nom: 'le dauphin', snd: 'dauphin' },
        { e: '🐳', cri: 'Ouuuuh !', nom: 'la baleine', snd: 'baleine' },
        { e: '🦭', cri: 'Ar ar ar !', nom: 'le phoque', snd: 'phoque' },
        { e: '🐧', cri: 'Couac couac !', nom: 'le pingouin', snd: 'manchot' }
      ]
    }
  ];

  App.lines(['Touche un animal !']);
  PAGES.forEach(function (p) {
    App.lines([p.nom]);
    p.list.forEach(function (an) { App.lines(["C'est " + an.nom + ' !']); });
  });

  // ------------------------------------------------------------ Vrais cris
  var RECORDED = [];
  PAGES.forEach(function (p) { p.list.forEach(function (an) { RECORDED.push(an.snd); }); });

  function soundUrl(key) { return 'sounds/' + key + '.mp3'; }

  // Joue le cri d'un animal ; promesse de sa durée (s), 0 s'il n'y a pas d'enregistrement.
  // Utilisé aussi par le jeu des ombres.
  function cry(key) {
    if (RECORDED.indexOf(key) < 0) return Promise.resolve(0);
    return App.Sfx.sample(soundUrl(key), 'cry');
  }

  function preload(keys) {
    keys.forEach(function (k) { if (RECORDED.indexOf(k) >= 0) App.Sfx.preload(soundUrl(k)); });
  }

  window.Animals = { cry: cry, preload: preload };

  // ------------------------------------------------------------ Jeu
  App.register({
    id: 'animals',
    name: 'Animaux',
    icon: '🐮',
    color: '#7bd389',
    start: function (kit) {
      var h = App.h;
      var wrap = h('div', 'animals', kit.root);
      var grid = h('div', 'grid', wrap);
      var prev = h('button', 'round-btn nav-btn left', wrap, '⬅️');
      var next = h('button', 'round-btn nav-btn right', wrap, '➡️');
      var dots = h('div', 'page-dots', wrap);
      var dotEls = PAGES.map(function () { return h('span', null, dots); });
      var pageIdx = 0, voiceTimer = 0, taps = 0;

      function show(i, quiet) {
        pageIdx = (i + PAGES.length) % PAGES.length;
        var page = PAGES[pageIdx];
        wrap.style.background = page.bg;
        dotEls.forEach(function (d, k) { d.classList.toggle('on', k === pageIdx); });
        if (!quiet) App.say(page.nom);
        preload(page.list.map(function (an) { return an.snd; }));
        grid.innerHTML = '';
        grid.style.gridTemplateColumns = 'repeat(' + (page.list.length === 4 ? 2 : 3) + ', 1fr)';
        page.list.forEach(function (an) {
          var b = h('button', 'animal', grid, an.e);
          b.addEventListener('pointerdown', function () {
            App.bounce(b);
            var old = b.querySelector('.bubble-say');
            if (old) old.remove();
            var bubble = h('div', 'bubble-say', b, an.cri);
            var tapId = ++taps;
            clearTimeout(voiceTimer);
            cry(an.snd).then(function (len) {
              kit.later(function () { bubble.remove(); }, Math.max(1800, len * 1000 + 600));
              if (tapId !== taps) return; // un autre animal a été touché entre-temps
              // la voix dit le nom juste après le cri
              voiceTimer = kit.later(function () { App.say("C'est " + an.nom + ' !'); }, len * 1000 + 150);
            });
          });
        });
      }

      kit.on(prev, 'pointerdown', function () { App.Sfx.flip(); App.bounce(prev); show(pageIdx - 1); });
      kit.on(next, 'pointerdown', function () { App.Sfx.flip(); App.bounce(next); show(pageIdx + 1); });

      show(0, true);
      App.say('Touche un animal !');
      return function () { clearTimeout(voiceTimer); };
    }
  });
})();
