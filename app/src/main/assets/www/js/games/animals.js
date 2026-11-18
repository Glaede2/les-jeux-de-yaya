/*
 * Les cris des animaux : on touche un animal, il saute, on entend son cri,
 * puis la voix dit son nom. 24 animaux sur 4 pages.
 *
 * Les cris sont de vrais enregistrements (dossier sounds/, sources libres : voir sounds/CREDITS.txt).
 * Si un enregistrement manque, on retombe sur un cri synthétisé (Web Audio) décrit ci-dessous.
 * Chaque cri synthétisé est une liste de couches :
 *   at   début (s)         dur  durée (s)        wave  sine|square|sawtooth|triangle|noise
 *   f    fréquence, nombre ou [[t, Hz], ...]     vol   volume max   a / r  attaque / relâche (s)
 *   filt [type, Hz, Q]     ff   fréquence du filtre au cours du temps [[t, Hz], ...]
 *   vib  [vitesse, ampleur Hz] (vibrato)         trem [vitesse, profondeur 0..1] (trémolo)
 */
(function () {
  'use strict';

  function rep(n, gap, fn) {
    var out = [];
    for (var i = 0; i < n; i++) out = out.concat(fn(i * gap, i));
    return out;
  }

  var CRIS = {
    vache: [
      { wave: 'sawtooth', f: [[0, 140], [0.25, 165], [1.1, 115]], dur: 1.25, vol: 0.35, a: 0.12, r: 0.3, filt: ['lowpass', 700, 3], ff: [[0, 400], [0.3, 900], [1.25, 500]], vib: [4, 3] },
      { wave: 'sawtooth', f: [[0, 141], [0.25, 166], [1.1, 116]], dur: 1.25, vol: 0.2, a: 0.12, r: 0.3, filt: ['lowpass', 500, 1] }
    ],
    cochon: rep(2, 0.32, function (at) {
      return [
        { at: at, wave: 'sawtooth', f: [[0, 120], [0.2, 85]], dur: 0.22, vol: 0.4, a: 0.01, r: 0.08, filt: ['lowpass', 650, 7], trem: [38, 0.8] },
        { at: at, wave: 'noise', dur: 0.2, vol: 0.25, a: 0.01, r: 0.08, filt: ['bandpass', 350, 3] }
      ];
    }),
    mouton: [
      { wave: 'sawtooth', f: [[0, 340], [0.8, 300]], dur: 0.95, vol: 0.3, a: 0.05, r: 0.2, filt: ['bandpass', 1100, 1.2], vib: [7, 22], trem: [7, 0.5] }
    ],
    cheval: [
      { wave: 'sawtooth', f: [[0, 700], [0.15, 1300], [0.9, 450]], dur: 1.0, vol: 0.25, a: 0.03, r: 0.25, filt: ['bandpass', 1600, 1], vib: [10, 70] },
      { at: 1.0, wave: 'noise', dur: 0.35, vol: 0.2, a: 0.02, r: 0.2, filt: ['bandpass', 600, 1.5], trem: [30, 0.7] }
    ],
    poule: rep(3, 0.17, function (at) {
      return [{ at: at, wave: 'square', f: [[0, 750], [0.07, 520]], dur: 0.08, vol: 0.18, a: 0.005, r: 0.03, filt: ['bandpass', 1100, 3] }];
    }).concat([
      { at: 0.6, wave: 'square', f: [[0, 700], [0.12, 1050], [0.4, 800]], dur: 0.42, vol: 0.18, a: 0.02, r: 0.1, filt: ['bandpass', 1200, 3], vib: [12, 30] }
    ]),
    canard: rep(2, 0.3, function (at) {
      return [
        { at: at, wave: 'sawtooth', f: [[0, 520], [0.2, 430]], dur: 0.2, vol: 0.3, a: 0.01, r: 0.06, filt: ['bandpass', 1200, 7] },
        { at: at, wave: 'square', f: [[0, 260], [0.2, 215]], dur: 0.2, vol: 0.08, a: 0.01, r: 0.06, filt: ['bandpass', 1000, 5] }
      ];
    }),
    chien: rep(2, 0.32, function (at) {
      return [
        { at: at, wave: 'noise', dur: 0.1, vol: 0.35, a: 0.005, r: 0.06, filt: ['bandpass', 900, 1.2] },
        { at: at, wave: 'sawtooth', f: [[0, 480], [0.14, 260]], dur: 0.16, vol: 0.35, a: 0.005, r: 0.07, filt: ['lowpass', 1600, 2] }
      ];
    }),
    chat: [
      { wave: 'sawtooth', f: [[0, 480], [0.25, 780], [0.85, 430]], dur: 0.9, vol: 0.25, a: 0.06, r: 0.2, filt: ['bandpass', 800, 4], ff: [[0, 600], [0.3, 1900], [0.9, 700]], vib: [6, 8] }
    ],
    souris: rep(3, 0.14, function (at) {
      return [{ at: at, wave: 'sine', f: [[0, 2800], [0.07, 3600]], dur: 0.08, vol: 0.15, a: 0.005, r: 0.03 }];
    }),
    oiseau: rep(2, 0.45, function (at) {
      return [
        { at: at, wave: 'sine', f: [[0, 2600], [0.07, 4200]], dur: 0.08, vol: 0.15, a: 0.005, r: 0.03 },
        { at: at + 0.14, wave: 'sine', f: [[0, 3000], [0.09, 4500], [0.12, 3500]], dur: 0.12, vol: 0.15, a: 0.005, r: 0.03 }
      ];
    }),
    coq: [
      { at: 0, wave: 'sawtooth', f: [[0, 520], [0.1, 600]], dur: 0.13, vol: 0.22, a: 0.01, r: 0.04, filt: ['bandpass', 1300, 1.5] },
      { at: 0.17, wave: 'sawtooth', f: [[0, 600], [0.1, 700]], dur: 0.13, vol: 0.22, a: 0.01, r: 0.04, filt: ['bandpass', 1300, 1.5] },
      { at: 0.34, wave: 'sawtooth', f: [[0, 820], [0.12, 950]], dur: 0.16, vol: 0.22, a: 0.01, r: 0.05, filt: ['bandpass', 1300, 1.5] },
      { at: 0.55, wave: 'sawtooth', f: [[0, 950], [0.15, 1050], [0.75, 700]], dur: 0.8, vol: 0.22, a: 0.02, r: 0.2, filt: ['bandpass', 1300, 1.5], vib: [7, 25] }
    ],
    abeille: [
      { wave: 'sawtooth', f: [[0, 220], [0.4, 250], [0.8, 210], [1.2, 240]], dur: 1.3, vol: 0.18, a: 0.1, r: 0.3, filt: ['lowpass', 1500, 2], vib: [45, 12], trem: [3, 0.4] }
    ],
    lion: [
      { wave: 'noise', dur: 1.3, vol: 0.45, a: 0.15, r: 0.4, filt: ['lowpass', 500, 1.5], ff: [[0, 300], [0.3, 700], [1.3, 250]], trem: [22, 0.6] },
      { wave: 'sawtooth', f: [[0, 80], [0.3, 120], [1.3, 60]], dur: 1.3, vol: 0.35, a: 0.15, r: 0.4, filt: ['lowpass', 400, 3], trem: [22, 0.5] }
    ],
    elephant: [
      { wave: 'sawtooth', f: [[0, 420], [0.12, 640], [0.9, 560], [1.1, 500]], dur: 1.15, vol: 0.25, a: 0.03, r: 0.2, filt: ['lowpass', 2800, 2], vib: [6, 18] },
      { wave: 'square', f: [[0, 421], [0.12, 642], [0.9, 562], [1.1, 502]], dur: 1.15, vol: 0.08, a: 0.03, r: 0.2, filt: ['bandpass', 1400, 2] }
    ],
    singe: rep(2, 0.22, function (at) {
      return [{ at: at, wave: 'triangle', f: [[0, 380], [0.15, 620]], dur: 0.17, vol: 0.35, a: 0.02, r: 0.05 }];
    }).concat(rep(3, 0.16, function (at) {
      return [{ at: 0.5 + at, wave: 'sawtooth', f: [[0, 950], [0.11, 750]], dur: 0.12, vol: 0.2, a: 0.01, r: 0.04, filt: ['bandpass', 1200, 2] }];
    })),
    tigre: [
      { wave: 'noise', dur: 0.8, vol: 0.4, a: 0.05, r: 0.3, filt: ['bandpass', 450, 1.5], trem: [28, 0.7] },
      { wave: 'sawtooth', f: [[0, 100], [0.8, 85]], dur: 0.8, vol: 0.3, a: 0.05, r: 0.3, filt: ['lowpass', 500, 3], trem: [28, 0.6] }
    ],
    serpent: [
      { wave: 'noise', dur: 1.1, vol: 0.25, a: 0.15, r: 0.3, filt: ['highpass', 4500, 1] }
    ],
    perroquet: rep(2, 0.3, function (at) {
      return [{ at: at, wave: 'sawtooth', f: [[0, 1300], [0.2, 900]], dur: 0.22, vol: 0.2, a: 0.01, r: 0.08, filt: ['bandpass', 2200, 3], vib: [30, 60] }];
    }),
    grenouille: rep(2, 0.45, function (at) {
      return [{ at: at, wave: 'sawtooth', f: [[0, 120], [0.3, 100]], dur: 0.32, vol: 0.4, a: 0.02, r: 0.08, filt: ['bandpass', 600, 5], trem: [24, 0.9] }];
    }),
    hibou: [
      { wave: 'sine', f: [[0, 400], [0.35, 370]], dur: 0.4, vol: 0.4, a: 0.08, r: 0.15 },
      { at: 0.55, wave: 'sine', f: [[0, 420], [0.25, 430], [0.7, 360]], dur: 0.75, vol: 0.4, a: 0.08, r: 0.25, vib: [5, 6] }
    ],
    loup: [
      { wave: 'triangle', f: [[0, 300], [0.4, 620], [1.4, 560], [1.9, 330]], dur: 2.0, vol: 0.35, a: 0.2, r: 0.4, vib: [5, 10] },
      { wave: 'sine', f: [[0, 600], [0.4, 1240], [1.4, 1120], [1.9, 660]], dur: 2.0, vol: 0.08, a: 0.2, r: 0.4 }
    ],
    ours: [
      { wave: 'noise', dur: 1.0, vol: 0.45, a: 0.1, r: 0.3, filt: ['lowpass', 280, 1.5], trem: [18, 0.7] },
      { wave: 'sawtooth', f: [[0, 55], [0.3, 70], [1.0, 50]], dur: 1.0, vol: 0.4, a: 0.1, r: 0.3, filt: ['lowpass', 300, 3], trem: [18, 0.6] }
    ],
    dauphin: rep(6, 0.045, function (at) {
      return [{ at: at, wave: 'noise', dur: 0.02, vol: 0.3, a: 0.001, r: 0.01, filt: ['bandpass', 3000, 2] }];
    }).concat([
      { at: 0.35, wave: 'sine', f: [[0, 1800], [0.25, 3200], [0.6, 2200]], dur: 0.65, vol: 0.2, a: 0.03, r: 0.15, vib: [12, 80] }
    ]),
    baleine: [
      { wave: 'sine', f: [[0, 180], [0.6, 420], [1.6, 380], [2.2, 150]], dur: 2.3, vol: 0.4, a: 0.3, r: 0.5, vib: [3, 8] },
      { wave: 'triangle', f: [[0, 360], [0.6, 840], [1.6, 760], [2.2, 300]], dur: 2.3, vol: 0.06, a: 0.3, r: 0.5 }
    ]
  };

  var PAGES = [
    {
      nom: 'La ferme',
      bg: 'linear-gradient(#bdefff 0%, #bdefff 55%, #9be15d 55%)',
      list: [
        { e: '🐮', cri: 'Meuh !', nom: 'la vache', snd: 'vache' },
        { e: '🐷', cri: 'Groin groin !', nom: 'le cochon', snd: 'cochon' },
        { e: '🐑', cri: 'Bêêê !', nom: 'le mouton', snd: 'mouton' },
        { e: '🐴', cri: 'Hiii hiii !', nom: 'le cheval', snd: 'cheval' },
        { e: '🐔', cri: 'Cot cot codet !', nom: 'la poule', snd: 'poule' },
        { e: '🦆', cri: 'Coin coin !', nom: 'le canard', snd: 'canard' }
      ]
    },
    {
      nom: 'La maison et le jardin',
      bg: 'linear-gradient(#ffe5ec 0%, #ffe5ec 55%, #c7f9cc 55%)',
      list: [
        { e: '🐶', cri: 'Ouaf ouaf !', nom: 'le chien', snd: 'chien' },
        { e: '🐱', cri: 'Miaou !', nom: 'le chat', snd: 'chat' },
        { e: '🐭', cri: 'Couic couic !', nom: 'la souris', snd: 'souris' },
        { e: '🐦', cri: 'Cui-cui !', nom: "l'oiseau", snd: 'oiseau' },
        { e: '🐓', cri: 'Cocorico !', nom: 'le coq', snd: 'coq' },
        { e: '🐝', cri: 'Bzzz !', nom: "l'abeille", snd: 'abeille' }
      ]
    },
    {
      nom: 'La savane et la jungle',
      bg: 'linear-gradient(#ffd9a0 0%, #ffe8a3 55%, #e9c46a 55%)',
      list: [
        { e: '🦁', cri: 'Groaaar !', nom: 'le lion', snd: 'lion' },
        { e: '🐘', cri: 'Pouuuuh !', nom: "l'éléphant", snd: 'elephant' },
        { e: '🐵', cri: 'Hou hou ha ha !', nom: 'le singe', snd: 'singe' },
        { e: '🐯', cri: 'Grrrr !', nom: 'le tigre', snd: 'tigre' },
        { e: '🐍', cri: 'Sssss !', nom: 'le serpent', snd: 'serpent' },
        { e: '🦜', cri: 'Croaa croaa !', nom: 'le perroquet', snd: 'perroquet' }
      ]
    },
    {
      nom: 'La forêt et la mer',
      bg: 'linear-gradient(#b8e0d2 0%, #b8e0d2 55%, #7ec4cf 55%)',
      list: [
        { e: '🐸', cri: 'Croâ croâ !', nom: 'la grenouille', snd: 'grenouille' },
        { e: '🦉', cri: 'Hou hou !', nom: 'le hibou', snd: 'hibou' },
        { e: '🐺', cri: 'Aouuuh !', nom: 'le loup', snd: 'loup' },
        { e: '🐻', cri: 'Grrr !', nom: "l'ours", snd: 'ours' },
        { e: '🐬', cri: 'Hiii clic clic !', nom: 'le dauphin', snd: 'dauphin' },
        { e: '🐳', cri: 'Ouuuuh !', nom: 'la baleine', snd: 'baleine' }
      ]
    }
  ];

  App.lines(['Touche un animal !']);
  PAGES.forEach(function (p) {
    App.lines([p.nom]);
    p.list.forEach(function (an) { App.lines(["C'est " + an.nom + ' !']); });
  });

  // ------------------------------------------------------------ Synthétiseur
  var noiseBuf = null, bus = null;

  function setParam(p, v, t) {
    if (typeof v === 'number') { p.setValueAtTime(v, t); return; }
    p.setValueAtTime(v[0][1], t + v[0][0]);
    for (var i = 1; i < v.length; i++) p.linearRampToValueAtTime(v[i][1], t + v[i][0]);
  }

  function lfo(a, rate, depth, target, t, end) {
    var o = a.createOscillator(), g = a.createGain();
    o.frequency.value = rate;
    g.gain.value = depth;
    o.connect(g);
    g.connect(target);
    o.start(t);
    o.stop(end);
  }

  function layer(a, out, L, t0) {
    var t = t0 + (L.at || 0), dur = L.dur, end = t + dur + 0.05;
    var src;
    if (L.wave === 'noise') {
      if (!noiseBuf) {
        noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
        var d = noiseBuf.getChannelData(0);
        for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      src = a.createBufferSource();
      src.buffer = noiseBuf;
      src.loop = true;
    } else {
      src = a.createOscillator();
      src.type = L.wave;
      setParam(src.frequency, L.f, t);
      if (L.vib) lfo(a, L.vib[0], L.vib[1], src.frequency, t, end);
    }
    var node = src;
    if (L.filt) {
      var fl = a.createBiquadFilter();
      fl.type = L.filt[0];
      fl.Q.value = L.filt[2] || 1;
      setParam(fl.frequency, L.ff || L.filt[1], t);
      node.connect(fl);
      node = fl;
    }
    if (L.trem) {
      var tg = a.createGain();
      tg.gain.value = 1 - L.trem[1] / 2;
      lfo(a, L.trem[0], L.trem[1] / 2, tg.gain, t, end);
      node.connect(tg);
      node = tg;
    }
    var g = a.createGain(), at = L.a || 0.02, rel = L.r || 0.08;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(L.vol, t + at);
    g.gain.setValueAtTime(L.vol, t + Math.max(at, dur - rel));
    g.gain.linearRampToValueAtTime(0, t + dur);
    node.connect(g);
    g.connect(out);
    src.start(t);
    src.stop(end);
  }

  // Joue un cri ; coupe en douceur le cri précédent. Renvoie sa durée (s).
  function playCry(spec) {
    var a = App.Sfx.ctx();
    if (!a) return 0;
    var now = a.currentTime;
    if (bus) {
      bus.gain.setValueAtTime(bus.gain.value, now);
      bus.gain.linearRampToValueAtTime(0, now + 0.06);
    }
    bus = a.createGain();
    bus.connect(a.destination);
    var len = 0;
    spec.forEach(function (L) {
      layer(a, bus, L, now + 0.02);
      len = Math.max(len, (L.at || 0) + L.dur);
    });
    return len;
  }

  // ------------------------------------------------------------ Vrais cris
  // Animaux qui ont un enregistrement dans sounds/<nom>.mp3
  var RECORDED = /*RECORDED*/['vache', 'mouton', 'poule', 'chien', 'chat', 'lion', 'elephant', 'grenouille', 'loup'];

  function soundUrl(key) { return 'sounds/' + key + '.mp3'; }

  // Joue le cri d'un animal ; promesse de sa durée (s). Utilisé aussi par le jeu des ombres.
  function cry(key) {
    if (RECORDED.indexOf(key) >= 0) {
      if (bus) { // coupe un cri synthétisé en cours
        bus.gain.cancelScheduledValues(0);
        bus.gain.setValueAtTime(0, App.Sfx.ctx().currentTime);
        bus = null;
      }
      return App.Sfx.sample(soundUrl(key), 'cry').then(function (len) {
        return len || (CRIS[key] ? playCry(CRIS[key]) : 0);
      });
    }
    return Promise.resolve(CRIS[key] ? playCry(CRIS[key]) : 0);
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
