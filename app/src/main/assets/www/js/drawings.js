/*
 * Dessins vectoriels partagés par le coloriage et les puzzles.
 * Repère : 400 x 300. Chaque dessin a :
 *  - regions : zones coloriables, dans l'ordre d'affichage (la 1re = le fond).
 *              c = couleur de l'image du puzzle, g = dégradé facultatif [x0, y0, x1, y1, couleur2]
 *  - lines   : traits (bouches, moustaches, rayons…)
 *  - dots    : points [x, y, rayon] (yeux, boutons…) ; les gros reçoivent un reflet dans le puzzle
 *  - under   : (puzzle) décor peint juste au-dessus du fond (lumière, lueurs)
 *  - art     : (puzzle) finitions peintes par-dessus les couleurs (reflets, herbe, ombres)
 * Le coloriage n'utilise que les contours ; le puzzle peint une vraie illustration.
 * Aucune image : tout est dessiné en code, donc l'appli reste légère.
 */
var Drawings = (function () {
  'use strict';

  var W = 400, H = 300, INK = '#3a2e5a', INK_ART = '#4a3b6b';

  // ---------------------------------------------------------- Formes de base
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
    r = Math.min(r || 0, w / 2, h / 2);
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
  // Nuage tout rond, d'un seul contour (pas de traits à l'intérieur)
  function cloud(x, y, s) {
    var p = new Path2D();
    function m(dx, dy) { return [x + dx * s, y + dy * s]; }
    var a = m(-40, 16);
    p.moveTo(a[0], a[1]);
    var b = [m(-64, 16), m(-60, -12), m(-34, -8)];
    p.bezierCurveTo(b[0][0], b[0][1], b[1][0], b[1][1], b[2][0], b[2][1]);
    b = [m(-30, -36), m(6, -42), m(12, -18)];
    p.bezierCurveTo(b[0][0], b[0][1], b[1][0], b[1][1], b[2][0], b[2][1]);
    b = [m(26, -34), m(56, -22), m(46, -2)];
    p.bezierCurveTo(b[0][0], b[0][1], b[1][0], b[1][1], b[2][0], b[2][1]);
    b = [m(66, 0), m(62, 18), m(42, 16)];
    p.bezierCurveTo(b[0][0], b[0][1], b[1][0], b[1][1], b[2][0], b[2][1]);
    p.closePath();
    return p;
  }
  function heart(x, y, s) {
    return S('M' + x + ' ' + (y + 9 * s) +
      ' C' + (x - 14 * s) + ' ' + (y - 1 * s) + ' ' + (x - 10 * s) + ' ' + (y - 12 * s) + ' ' + x + ' ' + (y - 5 * s) +
      ' C' + (x + 10 * s) + ' ' + (y - 12 * s) + ' ' + (x + 14 * s) + ' ' + (y - 1 * s) + ' ' + x + ' ' + (y + 9 * s) + ' Z');
  }
  function z(path, c, g) { return { path: path, c: c, g: g }; }

  // ---------------------------------------------------------- Petits outils de peinture (puzzle)
  function lin(ctx, x0, y0, x1, y1, stops) {
    var g = ctx.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(function (s, i) { g.addColorStop(i / (stops.length - 1), s); });
    return g;
  }
  function rad(ctx, x, y, r0, r1, c0, c1) {
    var g = ctx.createRadialGradient(x, y, r0, x, y, r1);
    g.addColorStop(0, c0);
    g.addColorStop(1, c1);
    return g;
  }
  function fill(ctx, path, style) { ctx.fillStyle = style; ctx.fill(path); }
  function shine(ctx, x, y, rx, ry, rot, a) { fill(ctx, E(x, y, rx, ry, rot), 'rgba(255,255,255,' + (a || 0.45) + ')'); }
  function shadow(ctx, x, y, rx, ry, a) { fill(ctx, E(x, y, rx, ry), 'rgba(40,30,70,' + (a || 0.14) + ')'); }
  // Brins d'herbe
  function grass(ctx, y0, y1, color, n) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    for (var i = 0; i < n; i++) {
      var x = (i * 97.3) % W, y = y0 + ((i * 53.7) % (y1 - y0)), hgt = 5 + (i % 4) * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 1, y - hgt * 0.6, x + (i % 2 ? 3 : -3), y - hgt);
      ctx.stroke();
    }
  }
  function sparkle(ctx, x, y, s, color) {
    ctx.fillStyle = color || 'rgba(255,255,255,0.9)';
    ctx.fill(S('M' + x + ' ' + (y - s) + ' Q' + x + ' ' + y + ' ' + (x + s) + ' ' + y + ' Q' + x + ' ' + y + ' ' + x + ' ' + (y + s) +
      ' Q' + x + ' ' + y + ' ' + (x - s) + ' ' + y + ' Q' + x + ' ' + y + ' ' + x + ' ' + (y - s) + ' Z'));
  }

  var pages = [];

  // ---------------------------------------------------------- 1. La maison
  var sunFace = {
    lines: [S('M329 66 Q340 75 351 66')],
    dots: [[331, 54, 3.4], [349, 54, 3.4]]
  };
  pages.push({
    name: 'La maison',
    regions: [
      z(R(0, 0, W, H), '#8fd3ff', [0, 0, 0, 230, '#e4f5ff']),
      z(C(340, 58, 30), '#ffd23f', [340, 28, 340, 88, '#ffb703']),
      z(cloud(92, 70, 0.9), '#ffffff', [92, 40, 92, 90, '#e9f2ff']),
      z(S('M0 212 Q90 160 205 204 T400 186 V300 H0 Z'), '#a7e07c', [0, 170, 0, 240, '#8fd16a']),
      z(S('M0 238 Q120 218 220 234 T400 230 V300 H0 Z'), '#7ccf5a', [0, 225, 0, 300, '#5cb83d']),
      z(S('M186 300 Q190 272 199 254 L215 254 Q222 272 228 300 Z'), '#f6e3c5', [0, 254, 0, 300, '#ecd3ab']),
      z(R(233, 90, 20, 40, 4), '#c9897a', [233, 0, 253, 0, '#a96b5e']),
      z(R(118, 150, 150, 104, 8), '#ffd8a8', [0, 150, 0, 254, '#ffc285']),
      z(S('M100 154 L193 80 L286 154 Q291 163 281 165 L105 165 Q95 163 100 154 Z'), '#ff6b8b', [0, 80, 0, 165, '#e5486b']),
      z(C(193, 130, 15), '#cdf0ff', [193, 115, 193, 145, '#9ad8f5']),
      z(S('M179 254 V208 Q179 188 197 188 Q215 188 215 208 V254 Z'), '#9d6bd8', [0, 188, 0, 254, '#7d4fbf']),
      z(R(132, 178, 32, 30, 7), '#cdf0ff', [0, 178, 0, 208, '#9ad8f5']),
      z(R(228, 178, 32, 30, 7), '#cdf0ff', [0, 178, 0, 208, '#9ad8f5']),
      z(R(128, 208, 40, 9, 4), '#c9897a'), z(R(224, 208, 40, 9, 4), '#c9897a'),
      z(C(138, 204, 5), '#ff70a6'), z(C(148, 202, 5), '#ffd23f'), z(C(158, 204, 5), '#ff70a6'),
      z(C(234, 204, 5), '#ffd23f'), z(C(244, 202, 5), '#ff70a6'), z(C(254, 204, 5), '#ffd23f'),
      z(R(320, 168, 16, 76, 6), '#a0714f', [320, 0, 336, 0, '#7f5539']),
      z(S('M300 156 C270 156 270 118 296 116 C294 92 330 84 340 102 C362 94 380 120 364 134 C376 150 358 164 340 158 C330 168 310 166 300 156 Z'), '#52b788', [0, 90, 0, 166, '#40916c']),
      z(C(304, 128, 6), '#ff595e'), z(C(344, 118, 6), '#ff595e'), z(C(334, 150, 6), '#ff595e'),
      z(C(46, 252, 10), '#ff70a6'), z(C(76, 266, 10), '#ffd23f'), z(C(370, 268, 9), '#c77dff')
    ],
    lines: [
      S('M148 178 V208 M132 193 H164 M244 178 V208 M228 193 H260 M193 115 V145 M178 130 H208'),
      S('M340 18 V8 M368 30 L376 22 M380 58 H390 M312 30 L304 22 M300 58 H290'),
      S('M46 262 V290 M76 276 V296 M370 277 V296'),
      sunFace.lines[0]
    ],
    dots: sunFace.dots.concat([[46, 252, 3.5], [76, 266, 3.5], [370, 268, 3], [207, 224, 3]]),
    under: function (ctx) {
      fill(ctx, C(340, 58, 70), rad(ctx, 340, 58, 20, 70, 'rgba(255,230,120,0.75)', 'rgba(255,230,120,0)'));
    },
    art: function (ctx) {
      fill(ctx, E(326, 66, 6, 4), 'rgba(255,120,150,0.6)'); fill(ctx, E(354, 66, 6, 4), 'rgba(255,120,150,0.6)');
      grass(ctx, 242, 300, 'rgba(40,110,30,0.45)', 46);
      shadow(ctx, 193, 257, 92, 6, 0.16);
      shine(ctx, 140, 186, 8, 4, -0.6, 0.6); shine(ctx, 236, 186, 8, 4, -0.6, 0.6); shine(ctx, 187, 124, 5, 3, -0.6, 0.6);
      // tuiles du toit
      ctx.strokeStyle = 'rgba(160,30,60,0.35)';
      ctx.lineWidth = 2;
      [[118, 140, 268], [136, 125, 250], [154, 110, 232], [172, 96, 214]].forEach(function (r) {
        ctx.beginPath();
        for (var x = r[0]; x < r[2]; x += 18) { ctx.moveTo(x, r[1]); ctx.quadraticCurveTo(x + 9, r[1] + 8, x + 18, r[1]); }
        ctx.stroke();
      });
      shine(ctx, 326, 112, 22, 9, -0.3, 0.25);
      shine(ctx, 80, 52, 26, 8, 0, 0.6);
    }
  });

  // ---------------------------------------------------------- 2. Le poisson
  pages.push({
    name: 'Le poisson',
    regions: [
      z(R(0, 0, W, H), '#5fd3f3', [0, 0, 0, 300, '#1a8fc7']),
      z(S('M0 254 Q100 236 200 250 T400 246 V300 H0 Z'), '#ffe5a0', [0, 240, 0, 300, '#f2c26b']),
      z(S('M30 262 C10 222 50 200 30 160 C62 190 42 222 56 258 Z'), '#2fb39e', [0, 160, 0, 262, '#1d8a78']),
      z(S('M352 258 C332 215 372 195 357 150 C389 185 369 215 380 256 Z'), '#5dd39e', [0, 150, 0, 258, '#34a874']),
      z(S('M304 276 Q318 236 332 276 Z'), '#ffafcc', [0, 240, 0, 276, '#ff85ad']),
      z(star(76, 270, 20, 9, 5), '#ff9b71', [0, 250, 0, 290, '#ff7b4f']),
      z(S('M114 148 Q84 102 62 112 Q78 148 62 184 Q84 194 114 148 Z'), '#ff9f1c', [62, 0, 114, 0, '#ffbf47']),
      z(S('M160 98 Q190 62 228 104 Z'), '#ff9f1c', [0, 64, 0, 104, '#ffbf47']),
      z(S('M178 196 Q196 226 220 192 Z'), '#ff9f1c'),
      z(E(192, 148, 80, 56), '#ffbf47', [0, 92, 0, 204, '#ff9500']),
      z(S('M160 98 Q142 148 160 198 L178 202 Q160 148 180 94 Z'), '#ffffff', [0, 94, 0, 202, '#fff1dd']),
      z(S('M222 98 Q208 148 222 198 L234 192 Q222 148 236 104 Z'), '#ffffff', [0, 94, 0, 202, '#fff1dd']),
      z(E(196, 160, 18, 10, 0.5), '#ffd166'),
      z(C(244, 134, 17), '#ffffff'),
      z(E(238, 168, 8, 5), '#ff8fab'),
      z(C(290, 98, 10), '#e6fbff', [0, 88, 0, 108, '#bfefff']),
      z(C(306, 64, 14), '#e6fbff', [0, 50, 0, 78, '#bfefff']),
      z(C(292, 28, 8), '#e6fbff', [0, 20, 0, 36, '#bfefff']),
      z(C(104, 58, 9), '#e6fbff', [0, 49, 0, 67, '#bfefff'])
    ],
    lines: [S('M254 166 Q264 172 272 162'), S('M311 276 Q318 256 318 246 M325 276 Q318 256 318 246')],
    dots: [[247, 136, 9]],
    under: function (ctx) {
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      [[40, 120], [150, 240], [270, 340]].forEach(function (r) { ctx.fill(P([r[0], 0, r[1], 0, r[1] + 60, 260, r[0] + 20, 260])); });
    },
    art: function (ctx) {
      ctx.strokeStyle = 'rgba(200,100,0,0.35)';
      ctx.lineWidth = 1.8;
      for (var row = 0; row < 3; row++) {
        for (var x = 186; x < 212; x += 12) {
          ctx.beginPath();
          ctx.arc(x, 124 + row * 18, 7, 0.2, Math.PI - 0.2);
          ctx.stroke();
        }
      }
      shine(ctx, 176, 112, 30, 9, -0.25, 0.4);
      [[290, 98, 10], [306, 64, 14], [292, 28, 8], [104, 58, 9]].forEach(function (b) { shine(ctx, b[0] - b[2] * 0.35, b[1] - b[2] * 0.4, b[2] * 0.35, b[2] * 0.22, -0.6, 0.9); });
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      [[40, 280], [140, 276], [230, 290], [270, 268], [350, 284]].forEach(function (d) { ctx.fill(C(d[0], d[1], 2)); });
    }
  });

  // ---------------------------------------------------------- 3. Le jardin (fleur, papillon, escargot)
  var garden = [
    z(R(0, 0, W, H), '#c6ecff', [0, 0, 0, 220, '#f1fbff']),
    z(C(46, 46, 24), '#ffd23f', [46, 22, 46, 70, '#ffb703']),
    z(S('M0 226 Q200 200 400 226 V300 H0 Z'), '#8fe388', [0, 210, 0, 300, '#5cc46b']),
    z(S('M146 252 C142 212 152 182 148 142 L157 142 C161 182 151 212 155 252 Z'), '#40916c'),
    z(S('M150 216 C120 192 100 206 96 218 C122 228 138 226 150 218 Z'), '#52b788', [96, 0, 150, 0, '#74c69d']),
    z(S('M155 198 C185 176 205 188 211 200 C185 210 169 208 155 200 Z'), '#52b788', [155, 0, 211, 0, '#74c69d'])
  ];
  for (var k = 0; k < 8; k++) {
    var an = k * Math.PI / 4;
    garden.push(z(E(152 + Math.cos(an) * 34, 108 + Math.sin(an) * 34, 22, 14, an), k % 2 ? '#ff99c8' : '#ff70a6',
      [152, 108, 152 + Math.cos(an) * 56, 108 + Math.sin(an) * 56, k % 2 ? '#ffc8dd' : '#ff99c8']));
  }
  garden.push(
    z(C(152, 108, 20), '#ffd166', [152, 88, 152, 128, '#ffb703']),
    z(E(270, 84, 28, 22, -0.5), '#b388ff', [250, 70, 290, 100, '#9b5de5']),
    z(E(314, 84, 28, 22, 0.5), '#b388ff', [334, 70, 294, 100, '#9b5de5']),
    z(E(276, 120, 19, 16, 0.4), '#4cc9f0', [276, 104, 276, 136, '#00a6d6']),
    z(E(308, 120, 19, 16, -0.4), '#4cc9f0', [308, 104, 308, 136, '#00a6d6']),
    z(C(268, 82, 8), '#ffd6ff'), z(C(316, 82, 8), '#ffd6ff'),
    z(E(292, 104, 8, 30), '#6d597a', [284, 0, 300, 0, '#4f3d5c']),
    z(S('M254 262 Q250 240 266 238 Q278 238 282 252 L338 252 Q352 254 346 262 Z'), '#c5e99b', [0, 238, 0, 262, '#a7d66f']),
    z(C(306, 230, 26), '#f8a978', [306, 204, 306, 256, '#e5793f']),
    z(S('M40 252 Q40 230 52 226 Q64 230 64 252 Z'), '#ff8fab'), z(S('M352 262 Q352 240 364 236 Q376 240 376 262 Z'), '#ffd166')
  );
  pages.push({
    name: 'Le jardin',
    regions: garden,
    lines: [
      S('M143 114 Q152 122 161 114'),
      S('M289 80 Q282 62 272 58 M295 80 Q302 62 312 58'),
      S('M306 230 m-14 0 a14 14 0 1 0 14 -14 a10 10 0 1 0 10 10 a6 6 0 1 0 -6 6'),
      S('M262 240 Q258 226 252 222 M268 238 Q268 224 266 218'),
      S('M52 252 V286 M364 262 V292'),
      S('M290 96 Q292 100 294 96')
    ],
    dots: [[144, 104, 3.2], [160, 104, 3.2], [272, 58, 3.5], [312, 58, 3.5], [252, 222, 3], [266, 218, 3], [287, 90, 2.4], [297, 90, 2.4]],
    under: function (ctx) { fill(ctx, C(46, 46, 52), rad(ctx, 46, 46, 18, 52, 'rgba(255,230,120,0.7)', 'rgba(255,230,120,0)')); },
    art: function (ctx) {
      fill(ctx, E(139, 115, 4.5, 3), 'rgba(255,110,150,0.6)'); fill(ctx, E(165, 115, 4.5, 3), 'rgba(255,110,150,0.6)');
      grass(ctx, 228, 300, 'rgba(30,110,50,0.4)', 50);
      shine(ctx, 146, 98, 7, 4, -0.5, 0.5);
      shine(ctx, 262, 76, 10, 5, -0.5, 0.4); shine(ctx, 322, 76, 10, 5, 0.5, 0.4);
      shine(ctx, 298, 220, 9, 5, -0.6, 0.45);
      shadow(ctx, 300, 264, 48, 4, 0.15);
      sparkle(ctx, 360, 40, 6); sparkle(ctx, 220, 50, 5); sparkle(ctx, 110, 30, 4);
    }
  });

  // ---------------------------------------------------------- 4. La voiture
  pages.push({
    name: 'La voiture',
    regions: [
      z(R(0, 0, W, H), '#a9dcff', [0, 0, 0, 220, '#eaf7ff']),
      z(C(58, 52, 26), '#ffd23f', [58, 26, 58, 78, '#ffb703']),
      z(cloud(300, 66, 0.9), '#ffffff', [0, 36, 0, 86, '#e9f2ff']),
      z(S('M0 210 Q100 168 210 200 T400 190 V240 H0 Z'), '#b7e4c7', [0, 175, 0, 240, '#95d5b2']),
      z(R(0, 222, W, 78), '#7d8597', [0, 222, 0, 300, '#5c677d']),
      z(S('M64 224 Q60 184 100 178 L136 174 Q158 132 198 130 L262 130 Q298 132 316 174 L332 178 Q358 184 354 224 Z'), '#ff4d6d', [0, 130, 0, 224, '#d90429']),
      z(S('M150 174 Q166 144 198 142 L222 142 L222 174 Z'), '#d7f3ff', [0, 142, 0, 174, '#a6dcf5']),
      z(S('M232 174 L232 142 L260 142 Q286 144 300 174 Z'), '#d7f3ff', [0, 142, 0, 174, '#a6dcf5']),
      z(E(344, 196, 7, 10), '#fff3a0'),
      z(R(62, 192, 8, 16, 3), '#ffb703'),
      z(C(126, 224, 28), '#2b2d42', [126, 196, 126, 252, '#1a1b2b']),
      z(C(126, 224, 12), '#e9ecef'),
      z(C(292, 224, 28), '#2b2d42', [292, 196, 292, 252, '#1a1b2b']),
      z(C(292, 224, 12), '#e9ecef')
    ],
    lines: [S('M227 178 V212 M240 186 H252'), S('M58 14 V6 M86 26 L92 20 M96 52 H104 M30 26 L24 20 M20 52 H12')],
    dots: [],
    under: function (ctx) { fill(ctx, C(58, 52, 58), rad(ctx, 58, 52, 20, 58, 'rgba(255,230,120,0.7)', 'rgba(255,230,120,0)')); },
    art: function (ctx) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      [10, 120, 230, 340].forEach(function (x) { ctx.fill(R(x, 268, 50, 8, 4)); });
      shadow(ctx, 210, 250, 150, 7, 0.25);
      fill(ctx, S('M110 182 Q150 176 160 176 L320 180 Q300 186 110 188 Z'), 'rgba(255,255,255,0.35)');
      shine(ctx, 176, 152, 12, 4, -0.7, 0.7); shine(ctx, 262, 152, 12, 4, -0.7, 0.7);
      shine(ctx, 120, 218, 4, 2.5, -0.6, 0.8); shine(ctx, 286, 218, 4, 2.5, -0.6, 0.8);
      fill(ctx, E(344, 196, 26, 14), rad(ctx, 350, 196, 4, 26, 'rgba(255,240,150,0.6)', 'rgba(255,240,150,0)'));
      shine(ctx, 290, 54, 26, 7, 0, 0.6);
    }
  });

  // ---------------------------------------------------------- 5. Le chat
  pages.push({
    name: 'Le chat',
    regions: [
      z(R(0, 0, W, H), '#ffe5ec', [0, 0, 0, 232, '#ffd0de']),
      z(R(0, 232, W, 68), '#f2cc8f', [0, 232, 0, 300, '#e0a96d']),
      z(E(200, 262, 160, 28), '#bde0fe', [0, 234, 0, 290, '#a2d2ff']),
      z(S('M250 226 C310 228 318 182 294 150 C287 143 278 150 284 158 C302 184 290 210 250 210 Z'), '#ffb26b', [250, 0, 318, 0, '#ff9a3c']),
      z(E(200, 208, 62, 46), '#ffb26b', [0, 162, 0, 254, '#ff9a3c']),
      z(E(200, 220, 32, 26), '#fff3e0'),
      z(S('M144 94 Q140 42 160 34 Q172 38 190 66 Z'), '#ffb26b'),
      z(S('M256 94 Q260 42 240 34 Q228 38 210 66 Z'), '#ffb26b'),
      z(S('M152 82 Q152 52 162 48 Q170 52 180 68 Z'), '#ffafcc'),
      z(S('M248 82 Q248 52 238 48 Q230 52 220 68 Z'), '#ffafcc'),
      z(E(200, 110, 66, 56), '#ffb26b', [0, 54, 0, 166, '#ff9a3c']),
      z(E(160, 128, 10, 6), '#ff8fab'), z(E(240, 128, 10, 6), '#ff8fab'),
      z(E(200, 122, 7, 5), '#ff6f91'),
      z(E(172, 252, 20, 11), '#ffb26b'), z(E(228, 252, 20, 11), '#ffb26b'),
      z(C(334, 246, 26), '#c77dff', [334, 220, 334, 272, '#9d4edd'])
    ],
    lines: [
      S('M200 127 Q194 138 184 133 M200 127 Q206 138 216 133'),
      S('M152 118 H118 M152 127 L120 136 M248 118 H282 M248 127 L280 136'),
      S('M192 62 L194 74 M200 60 V74 M208 62 L206 74'),
      S('M312 236 Q334 254 358 230 M314 258 Q334 238 356 262 M326 222 Q340 246 330 270'),
      S('M358 254 Q372 270 360 286 Q350 296 372 292')
    ],
    dots: [[176, 106, 9], [224, 106, 9]],
    art: function (ctx) {
      shadow(ctx, 210, 256, 90, 8, 0.15);
      shine(ctx, 176, 74, 18, 7, -0.3, 0.3);
      ctx.strokeStyle = 'rgba(200,100,20,0.35)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(146, 196); ctx.quadraticCurveTo(152, 206, 146, 216);
      ctx.moveTo(254, 196); ctx.quadraticCurveTo(248, 206, 254, 216);
      ctx.stroke();
      shine(ctx, 324, 236, 7, 4, -0.6, 0.5);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      [[40, 40], [90, 120], [330, 60], [370, 150], [60, 190]].forEach(function (d) { ctx.fill(heart(d[0], d[1], 0.7)); });
    }
  });

  // ---------------------------------------------------------- 6. Le bonhomme de neige
  function pine(x, y) {
    return S('M' + x + ' ' + (y - 70) + ' L' + (x + 22) + ' ' + (y - 36) + ' L' + (x + 12) + ' ' + (y - 36) + ' L' + (x + 30) + ' ' + (y - 8) +
      ' L' + (x - 30) + ' ' + (y - 8) + ' L' + (x - 12) + ' ' + (y - 36) + ' L' + (x - 22) + ' ' + (y - 36) + ' Z');
  }
  pages.push({
    name: 'Le bonhomme de neige',
    regions: [
      z(R(0, 0, W, H), '#9cc9ff', [0, 0, 0, 240, '#e0efff']),
      z(R(52, 216, 10, 20, 2), '#8d6346'), z(pine(57, 224), '#2d9a6a', [0, 154, 0, 216, '#1b7a50']),
      z(R(338, 206, 10, 20, 2), '#8d6346'), z(pine(343, 214), '#2d9a6a', [0, 144, 0, 206, '#1b7a50']),
      z(S('M0 234 Q200 204 400 238 V300 H0 Z'), '#ffffff', [0, 210, 0, 300, '#e3eefc']),
      z(C(200, 228, 52), '#ffffff', [170, 190, 230, 270, '#d9e7f7']),
      z(C(200, 152, 40), '#ffffff', [176, 120, 224, 186, '#d9e7f7']),
      z(C(200, 92, 32), '#ffffff', [180, 66, 222, 120, '#d9e7f7']),
      z(R(176, 22, 48, 42, 7), '#4a4e69', [176, 0, 224, 0, '#363a53']),
      z(R(176, 48, 48, 8, 0), '#ef476f'),
      z(R(160, 58, 80, 11, 5), '#4a4e69'),
      z(S('M200 92 Q228 95 240 100 Q228 104 200 101 Z'), '#fb8500', [200, 0, 240, 0, '#ffb703']),
      z(E(181, 100, 6, 4), '#ff8fab'), z(E(219, 100, 6, 4), '#ff8fab'),
      z(R(213, 124, 15, 36, 6), '#ef476f', [0, 124, 0, 160, '#d62f58']),
      z(R(166, 116, 68, 15, 7), '#ef476f', [166, 0, 234, 0, '#ff6b8b']),
      z(star(70, 80, 15, 6, 6), '#ffffff'), z(star(120, 150, 11, 4.5, 6), '#ffffff'),
      z(star(300, 120, 13, 5, 6), '#ffffff'), z(star(350, 60, 10, 4, 6), '#ffffff')
    ],
    lines: [
      S('M162 146 L120 116 M131 124 L120 104 M238 146 L280 114 M268 122 L282 102'),
      S('M190 108 Q200 114 210 108'),
      S('M218 160 V158 M223 160 V158')
    ],
    dots: [[189, 84, 4.5], [211, 84, 4.5], [200, 144, 5], [200, 164, 5], [200, 212, 5.5], [200, 236, 5.5]],
    under: function (ctx) {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      for (var i = 0; i < 40; i++) ctx.fill(C((i * 83.7) % W, (i * 47.3) % 220, 1.6 + (i % 3) * 0.7));
    },
    art: function (ctx) {
      shadow(ctx, 206, 278, 62, 7, 0.14);
      shine(ctx, 184, 210, 14, 8, -0.5, 0.7); shine(ctx, 188, 140, 10, 6, -0.5, 0.7); shine(ctx, 190, 80, 7, 4, -0.5, 0.7);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fill(S('M30 166 Q57 150 84 166 Q57 172 30 166 Z')); ctx.fill(S('M316 156 Q343 140 370 156 Q343 162 316 156 Z'));
      sparkle(ctx, 250, 40, 7); sparkle(ctx, 140, 40, 5); sparkle(ctx, 300, 190, 5);
    }
  });

  // ---------------------------------------------------------- 7. La fusée
  pages.push({
    name: 'La fusée',
    regions: [
      z(R(0, 0, W, H), '#2b2d6e', [0, 0, 0, 300, '#5a4fcf']),
      z(C(72, 74, 30), '#ffb38a', [52, 50, 92, 100, '#f4845f']),
      z(E(72, 78, 52, 9, -0.25), '#ffd166'),
      z(C(334, 236, 40), '#fff1a8', [314, 210, 360, 270, '#ffd166']),
      z(C(322, 226, 7), '#ffe066'), z(C(346, 250, 9), '#ffe066'), z(C(338, 216, 4), '#ffe066'),
      z(star(330, 60, 14, 6, 5), '#ffd23f'), z(star(60, 210, 10, 4.5, 5), '#ffd23f'),
      z(star(120, 140, 7, 3, 5), '#ffd23f'), z(star(280, 130, 8, 3.5, 5), '#ffd23f'),
      z(S('M178 222 Q200 300 222 222 Z'), '#ffb703', [0, 222, 0, 290, '#ff6d00']),
      z(S('M188 222 Q200 270 212 222 Z'), '#fff3a0'),
      z(S('M164 162 L128 218 Q126 224 134 222 L166 208 Z'), '#ef233c', [128, 0, 166, 0, '#ff5c74']),
      z(S('M236 162 L272 218 Q274 224 266 222 L234 208 Z'), '#ef233c', [272, 0, 234, 0, '#ff5c74']),
      z(S('M200 36 Q238 68 238 150 L238 214 L162 214 L162 150 Q162 68 200 36 Z'), '#ffffff', [162, 0, 238, 0, '#d8dce6']),
      z(S('M200 36 Q224 56 232 88 L168 88 Q176 56 200 36 Z'), '#ef233c', [0, 36, 0, 88, '#ff5c74']),
      z(R(168, 210, 64, 14, 6), '#8d99ae'),
      z(C(200, 132, 25), '#adb5bd'),
      z(C(200, 132, 18), '#a0e7ff', [200, 114, 200, 150, '#5bc0eb']),
      z(R(193, 178, 14, 22, 7), '#ef233c')
    ],
    lines: [S('M193 138 Q200 144 207 138')],
    dots: [[194, 129, 3], [206, 129, 3]],
    under: function (ctx) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (var i = 0; i < 46; i++) ctx.fill(C((i * 91.3) % W, (i * 57.9) % H, 0.9 + (i % 3) * 0.6));
    },
    art: function (ctx) {
      fill(ctx, C(334, 236, 70), rad(ctx, 334, 236, 38, 70, 'rgba(255,240,170,0.35)', 'rgba(255,240,170,0)'));
      shine(ctx, 186, 110, 6, 30, 0, 0.5);
      shine(ctx, 192, 124, 6, 3.5, -0.6, 0.8);
      shine(ctx, 62, 62, 9, 5, -0.5, 0.4);
      sparkle(ctx, 120, 40, 8, 'rgba(255,240,170,0.95)'); sparkle(ctx, 260, 30, 6, 'rgba(255,240,170,0.95)');
      sparkle(ctx, 370, 150, 6, 'rgba(255,240,170,0.95)'); sparkle(ctx, 30, 140, 5, 'rgba(255,240,170,0.95)');
    }
  });

  // ---------------------------------------------------------- 8. L'ourson et son ballon
  pages.push({
    name: "L'ourson",
    regions: [
      z(R(0, 0, W, H), '#fff1e6', [0, 0, 0, 240, '#ffe0ea']),
      z(R(0, 244, W, 56), '#cdb4db', [0, 244, 0, 300, '#b392c9']),
      z(heart(60, 60, 1.6), '#ffafcc'), z(heart(100, 150, 1.1), '#ffc8dd'), z(heart(350, 190, 1.3), '#ffafcc'),
      z(E(306, 78, 36, 44), '#ff595e', [290, 40, 320, 122, '#e63946']),
      z(P([300, 124, 312, 124, 306, 116]), '#e63946'),
      z(E(166, 246, 26, 18), '#d4a373', [0, 228, 0, 264, '#b8865a']),
      z(E(234, 246, 26, 18), '#d4a373', [0, 228, 0, 264, '#b8865a']),
      z(E(166, 250, 12, 9), '#fae1c4'), z(E(234, 250, 12, 9), '#fae1c4'),
      z(E(142, 198, 16, 28, 0.5), '#d4a373'),
      z(E(200, 208, 54, 48), '#d4a373', [0, 160, 0, 256, '#b8865a']),
      z(E(200, 216, 32, 30), '#fae1c4'),
      z(E(258, 172, 16, 28, -0.8), '#d4a373'),
      z(S('M200 162 L176 150 Q170 160 176 172 Z'), '#4cc9f0'), z(S('M200 162 L224 150 Q230 160 224 172 Z'), '#4cc9f0'),
      z(C(200, 162, 7), '#3a86ff'),
      z(C(156, 76, 20), '#d4a373'), z(C(244, 76, 20), '#d4a373'),
      z(C(156, 76, 10), '#fae1c4'), z(C(244, 76, 10), '#fae1c4'),
      z(C(200, 112, 50), '#d4a373', [0, 62, 0, 162, '#b8865a']),
      z(E(200, 132, 24, 17), '#fae1c4'),
      z(E(200, 124, 9, 6), '#5a3825'),
      z(E(170, 126, 8, 5), '#ff8fab'), z(E(230, 126, 8, 5), '#ff8fab')
    ],
    lines: [S('M200 130 V138 M200 138 Q192 145 186 139 M200 138 Q208 145 214 139'), S('M270 160 Q290 140 306 124')],
    dots: [[182, 106, 6], [218, 106, 6]],
    art: function (ctx) {
      shadow(ctx, 200, 262, 90, 7, 0.14);
      shine(ctx, 292, 62, 9, 16, -0.4, 0.45);
      shine(ctx, 182, 82, 16, 7, -0.3, 0.25);
      shine(ctx, 196, 121, 3, 2, -0.5, 0.7);
      sparkle(ctx, 360, 40, 7, 'rgba(255,255,255,0.95)'); sparkle(ctx, 250, 30, 5, 'rgba(255,255,255,0.95)');
    }
  });

  // Page blanche pour le dessin libre (coloriage uniquement)
  var blank = { name: 'Dessin libre', regions: [z(R(0, 0, W, H), '#ffffff')], lines: [], dots: [], blank: true };

  // ---------------------------------------------------------- Rendu
  function regionStyle(ctx, r) {
    if (!r.g) return r.c;
    return lin(ctx, r.g[0], r.g[1], r.g[2], r.g[3], [r.c, r.g[4]]);
  }

  // Image en couleur du dessin (pour les puzzles) : dégradés, lumière, finitions, contours doux
  function toImage(page, w, h) {
    var c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    var ctx = c.getContext('2d');
    ctx.scale(w / W, h / H);
    // chaque forme est peinte puis cernée, dans l'ordre : celles de devant cachent les traits de derrière
    page.regions.forEach(function (r, i) {
      ctx.fillStyle = regionStyle(ctx, r);
      ctx.fill(r.path);
      if (i === 0) { if (page.under) page.under(ctx); return; }
      ctx.lineJoin = 'round';
      ctx.strokeStyle = INK_ART;
      ctx.lineWidth = 2.6;
      ctx.stroke(r.path);
    });
    if (page.art) page.art(ctx);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = INK_ART;
    ctx.lineWidth = 2.6;
    page.lines.forEach(function (l) { ctx.stroke(l); });
    page.dots.forEach(function (d) {
      ctx.fillStyle = INK_ART;
      ctx.fill(C(d[0], d[1], d[2]));
      if (d[2] >= 3) { // petit reflet dans les yeux
        ctx.fillStyle = '#ffffff';
        ctx.fill(C(d[0] - d[2] * 0.32, d[1] - d[2] * 0.35, d[2] * 0.36));
      }
    });
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
    page.regions.forEach(function (r, i) {
      if (i === 0) return; // le fond n'a pas de contour
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fill(r.path);
      ctx.globalCompositeOperation = 'source-over';
      ctx.stroke(r.path);
    });
    page.lines.forEach(function (l) { ctx.stroke(l); });
    ctx.fillStyle = INK;
    page.dots.forEach(function (d) {
      ctx.fill(C(d[0], d[1], d[2]));
      if (d[2] >= 5) { // gros yeux : un reflet blanc, comme dans les dessins animés
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fill(C(d[0] - d[2] * 0.32, d[1] - d[2] * 0.35, d[2] * 0.34));
        ctx.globalCompositeOperation = 'source-over';
      }
    });
    return c;
  }

  return { W: W, H: H, pages: pages, blank: blank, toImage: toImage, lineArt: lineArt };
})();
