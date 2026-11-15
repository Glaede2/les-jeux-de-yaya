/*
 * Dessins vectoriels partagés par le coloriage et les puzzles.
 * Repère : 400 x 300. Chaque dessin a :
 *  - regions : zones coloriables, dans l'ordre d'affichage (la 1re = le fond),
 *              c = couleur utilisée pour l'image du puzzle
 *  - deco    : formes décoratives non coloriables (couleur fixe)
 *  - lines   : traits (yeux, bouche, moustaches...)
 *  - dots    : petits points noirs (pupilles, boutons...)
 * Aucune image : tout est dessiné en code, donc l'appli reste minuscule.
 */
var Drawings = (function () {
  'use strict';

  var W = 400, H = 300, INK = '#3a2e5a';

  function C(cx, cy, r) { var p = new Path2D(); p.arc(cx, cy, r, 0, Math.PI * 2); return p; }
  function E(cx, cy, rx, ry, rot) { var p = new Path2D(); p.ellipse(cx, cy, rx, ry, rot || 0, 0, Math.PI * 2); return p; }
  function S(d) { return new Path2D(d); }
  function P(pts) {
    var p = new Path2D();
    p.moveTo(pts[0], pts[1]);
    for (var i = 2; i < pts.length; i += 2) p.lineTo(pts[i], pts[i + 1]);
    p.closePath();
    return p;
  }
  // Rectangle aux coins arrondis (roundRect n'existe pas sur les vieux WebView)
  function R(x, y, w, h, r) {
    r = r || 0;
    var p = new Path2D();
    p.moveTo(x + r, y);
    p.arcTo(x + w, y, x + w, y + h, r);
    p.arcTo(x + w, y + h, x, y + h, r);
    p.arcTo(x, y + h, x, y, r);
    p.arcTo(x, y, x + w, y, r);
    p.closePath();
    return p;
  }
  function star(cx, cy, ro, ri, n) {
    var pts = [];
    for (var i = 0; i < n * 2; i++) {
      var a = -Math.PI / 2 + i * Math.PI / n, r = i % 2 ? ri : ro;
      pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    return P(pts);
  }
  function z(path, c) { return { path: path, c: c }; }

  var pages = [];

  // ---------------------------------------------------------- 1. La maison
  pages.push({
    name: 'La maison',
    regions: [
      z(R(0, 0, W, H), '#a8dcff'),
      z(C(345, 55, 32), '#ffd23f'),
      z(E(95, 62, 48, 22), '#ffffff'),
      z(R(0, 220, W, 80), '#7ed957'),
      z(R(225, 88, 22, 40), '#9d6b53'),
      z(R(110, 140, 150, 110), '#ffb4a2'),
      z(P([95, 145, 185, 80, 275, 145]), '#e5383b'),
      z(R(165, 190, 38, 60, 6), '#8d5524'),
      z(R(122, 162, 34, 34, 3), '#bde0fe'),
      z(R(214, 162, 34, 34, 3), '#bde0fe'),
      z(R(312, 170, 18, 62, 3), '#8d5524'),
      z(C(321, 148, 38), '#38b000'),
      z(C(40, 250, 12), '#ff70a6'),
      z(C(70, 262, 12), '#ffd23f')
    ],
    lines: [S('M139 162 V196 M122 179 H156 M231 162 V196 M214 179 H248')],
    dots: [C(195, 222, 3.5)]
  });

  // ---------------------------------------------------------- 2. Le poisson
  pages.push({
    name: 'Le poisson',
    regions: [
      z(R(0, 0, W, H), '#4cc9f0'),
      z(S('M0 255 Q100 235 200 255 T400 250 V300 H0 Z'), '#ffe8a3'),
      z(S('M28 262 C8 222 48 200 28 160 C60 190 40 222 54 258 Z'), '#2a9d8f'),
      z(S('M340 258 C320 215 360 195 345 150 C377 185 357 215 368 256 Z'), '#52b788'),
      z(P([115, 150, 58, 108, 58, 192]), '#ff9f1c'),
      z(S('M150 108 Q172 66 208 110 Z'), '#ff9f1c'),
      z(E(172, 150, 76, 48), '#ffbf69'),
      z(S('M168 104 Q150 150 168 196 Q186 150 168 104 Z'), '#ff6b6b'),
      z(C(216, 137, 12), '#ffffff'),
      z(C(272, 100, 10), '#e0fbfc'),
      z(C(292, 68, 14), '#e0fbfc'),
      z(C(280, 32, 8), '#e0fbfc'),
      z(star(300, 268, 24, 11, 5), '#ff70a6')
    ],
    lines: [S('M222 168 Q234 172 242 161')],
    dots: [C(219, 137, 5)]
  });

  // ---------------------------------------------------------- 3. La fleur et le papillon
  var flower = [
    z(R(0, 0, W, H), '#bde0fe'),
    z(C(48, 48, 28), '#ffd23f'),
    z(S('M0 232 Q200 205 400 232 V300 H0 Z'), '#70e000'),
    z(S('M148 248 C145 200 155 170 150 135 L158 135 C163 170 153 200 156 248 Z'), '#38b000'),
    z(S('M152 212 C122 188 104 202 98 215 C124 224 140 222 152 214 Z'), '#38b000')
  ];
  for (var k = 0; k < 6; k++) {
    var a = k * Math.PI / 3;
    flower.push(z(E(154 + Math.cos(a) * 30, 108 + Math.sin(a) * 30, 24, 15, a), k % 2 ? '#ff9770' : '#ff70a6'));
  }
  flower.push(
    z(C(154, 108, 18), '#ffd670'),
    z(E(268, 92, 27, 20, -0.5), '#9b5de5'),
    z(E(312, 92, 27, 20, 0.5), '#9b5de5'),
    z(E(274, 128, 18, 15, 0.4), '#00bbf9'),
    z(E(306, 128, 18, 15, -0.4), '#00bbf9'),
    z(E(290, 110, 6, 28), '#3a2e5a')
  );
  pages.push({
    name: 'La fleur',
    regions: flower,
    lines: [S('M287 84 Q280 66 272 62 M293 84 Q300 66 308 62')],
    dots: [C(272, 62, 3.5), C(308, 62, 3.5)]
  });

  // ---------------------------------------------------------- 4. La voiture
  pages.push({
    name: 'La voiture',
    regions: [
      z(R(0, 0, W, H), '#caf0f8'),
      z(C(60, 55, 30), '#ffd23f'),
      z(E(300, 60, 52, 22), '#ffffff'),
      z(R(0, 215, W, 85), '#adb5bd'),
      z(S('M70 215 Q70 175 110 172 L150 170 L182 128 L270 128 L306 170 L336 175 Q352 180 352 215 Z'), '#ef233c'),
      z(S('M160 170 L187 139 L222 139 L222 170 Z'), '#e0fbfc'),
      z(S('M232 170 L232 139 L265 139 L292 170 Z'), '#e0fbfc'),
      z(E(342, 193, 7, 10), '#ffd60a'),
      z(C(130, 215, 28), '#2b2d42'),
      z(C(130, 215, 12), '#edf2f4'),
      z(C(290, 215, 28), '#2b2d42'),
      z(C(290, 215, 12), '#edf2f4')
    ],
    deco: [
      { path: R(20, 266, 50, 8, 3), c: '#ffffff' },
      { path: R(175, 266, 50, 8, 3), c: '#ffffff' },
      { path: R(330, 266, 50, 8, 3), c: '#ffffff' }
    ],
    lines: [S('M227 174 V205 M240 182 H252')],
    dots: []
  });

  // ---------------------------------------------------------- 5. Le chat
  pages.push({
    name: 'Le chat',
    regions: [
      z(R(0, 0, W, H), '#ffe5ec'),
      z(R(0, 232, W, 68), '#e9c46a'),
      z(S('M245 222 C302 222 312 180 290 150 C284 144 276 150 281 157 C298 183 286 208 245 208 Z'), '#ffa94d'),
      z(E(200, 205, 62, 48), '#ffa94d'),
      z(E(200, 216, 32, 28), '#fff3e0'),
      z(P([142, 86, 150, 30, 184, 60]), '#ffa94d'),
      z(P([216, 60, 250, 30, 258, 86]), '#ffa94d'),
      z(C(200, 105, 60), '#ffa94d'),
      z(C(178, 95, 11), '#90e0ef'),
      z(C(222, 95, 11), '#90e0ef'),
      z(P([191, 116, 209, 116, 200, 126]), '#ff70a6'),
      z(E(174, 250, 19, 10), '#ffa94d'),
      z(E(226, 250, 19, 10), '#ffa94d'),
      z(C(332, 245, 30), '#4361ee')
    ],
    lines: [
      S('M200 126 Q193 138 182 132 M200 126 Q207 138 218 132'),
      S('M160 117 H126 M160 126 L128 135 M240 117 H274 M240 126 L272 135'),
      S('M306 232 Q332 252 358 228 M309 256 Q332 234 355 260')
    ],
    dots: [C(180, 96, 5), C(224, 96, 5)]
  });

  // ---------------------------------------------------------- 6. Le bonhomme de neige
  pages.push({
    name: 'Le bonhomme de neige',
    regions: [
      z(R(0, 0, W, H), '#a2d2ff'),
      z(C(340, 52, 26), '#ffd23f'),
      z(S('M0 232 Q200 202 400 236 V300 H0 Z'), '#ffffff'),
      z(C(200, 225, 55), '#ffffff'),
      z(C(200, 145, 40), '#ffffff'),
      z(C(200, 82, 30), '#ffffff'),
      z(R(178, 18, 44, 40, 3), '#2b2d42'),
      z(R(163, 52, 74, 11, 4), '#2b2d42'),
      z(P([199, 82, 230, 89, 199, 95]), '#fb8500'),
      z(R(212, 112, 15, 38, 5), '#e63946'),
      z(R(164, 106, 72, 15, 7), '#e63946'),
      z(star(70, 70, 16, 7, 6), '#ffffff'),
      z(star(110, 150, 12, 5, 6), '#ffffff'),
      z(star(300, 140, 14, 6, 6), '#ffffff')
    ],
    lines: [S('M162 142 L118 110 M130 119 L118 99 M238 142 L282 108 M269 118 L284 98')],
    dots: [C(190, 74, 4), C(210, 74, 4), C(200, 140, 5), C(200, 160, 5), C(200, 210, 5), C(200, 235, 5)]
  });

  // Page blanche pour le dessin libre (coloriage uniquement)
  var blank = { name: 'Dessin libre', regions: [z(R(0, 0, W, H), '#ffffff')], lines: [], dots: [], blank: true };

  // ---------------------------------------------------------- Rendu
  // fills[i] = couleur choisie (null = blanc) ; sans fills on prend les couleurs "puzzle"
  function paintFills(ctx, page, fills) {
    page.regions.forEach(function (r, i) {
      ctx.fillStyle = fills ? (fills[i] || '#ffffff') : r.c;
      ctx.fill(r.path);
    });
    (page.deco || []).forEach(function (d) {
      ctx.fillStyle = d.c;
      ctx.fill(d.path);
    });
  }

  function paintOutlines(ctx, page, lw) {
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw || 3.5;
    for (var i = 1; i < page.regions.length; i++) ctx.stroke(page.regions[i].path);
    page.lines.forEach(function (l) { ctx.stroke(l); });
    ctx.fillStyle = INK;
    page.dots.forEach(function (d) { ctx.fill(d); });
  }

  // Image en couleur du dessin (pour les puzzles)
  function toImage(page, w, h) {
    var c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    var ctx = c.getContext('2d');
    ctx.scale(w / W, h / H);
    paintFills(ctx, page, null);
    paintOutlines(ctx, page, 3);
    return c;
  }

  // Traits seuls sur fond transparent (pour le coloriage au pot de peinture).
  // Chaque forme efface d'abord les traits qu'elle recouvre, puis trace son contour :
  // ainsi la ligne de la pelouse ne traverse pas la maison, etc.
  function lineArt(page, w, h) {
    var c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    var ctx = c.getContext('2d');
    ctx.scale(w / W, h / H);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.5;
    page.regions.concat(page.deco || []).forEach(function (r, i) {
      if (i === 0) return; // le fond n'a pas de contour
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fill(r.path);
      ctx.globalCompositeOperation = 'source-over';
      ctx.stroke(r.path);
    });
    page.lines.forEach(function (l) { ctx.stroke(l); });
    ctx.fillStyle = INK;
    page.dots.forEach(function (d) { ctx.fill(d); });
    return c;
  }

  return {
    W: W, H: H, pages: pages, blank: blank,
    paintFills: paintFills, paintOutlines: paintOutlines, toImage: toImage, lineArt: lineArt
  };
})();
