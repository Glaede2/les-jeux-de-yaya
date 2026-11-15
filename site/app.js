/* Les jeux de Yaya : petites animations du site (sans bibliothèque). */
(function () {
  'use strict';

  var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------------------------------------------------------- Sons (comme dans l'appli)
  var actx = null;
  function tone(freq, dur, delay, type) {
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      var t = actx.currentTime + (delay || 0);
      var o = actx.createOscillator(), g = actx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(actx.destination);
      o.start(t);
      o.stop(t + dur + 0.05);
    } catch (e) { /* pas de son, tant pis */ }
  }

  // ---------------------------------------------------------------- Bulles de fond
  var COLORS = ['#ff8fab', '#ffd23f', '#8ac926', '#4cc9f0', '#b388ff', '#ff9f1c'];
  var box = document.querySelector('.bubbles');
  if (!calm) {
    for (var i = 0; i < 14; i++) {
      var b = document.createElement('span');
      var s = 18 + Math.random() * 46;
      b.style.width = b.style.height = s + 'px';
      b.style.left = (Math.random() * 100) + '%';
      b.style.setProperty('--c', COLORS[i % COLORS.length]);
      b.style.animationDuration = (16 + Math.random() * 18) + 's';
      b.style.animationDelay = (-Math.random() * 30) + 's';
      box.appendChild(b);
    }
  }

  // ---------------------------------------------------------------- Le prénom qui chante
  var NOTES = [523, 659, 784, 1047];
  document.querySelectorAll('.name span').forEach(function (l, k) {
    l.addEventListener('pointerdown', function () {
      tone(NOTES[k % NOTES.length], 0.6);
      tone(NOTES[k % NOTES.length] * 2, 0.25, 0, 'triangle');
      l.classList.remove('pop');
      void l.offsetWidth;
      l.classList.add('pop');
    });
    l.addEventListener('animationend', function () { l.classList.remove('pop'); });
  });

  // ---------------------------------------------------------------- Apparition au défilement
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !calm) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target, siblings = Array.prototype.indexOf.call(el.parentNode.children, el);
        el.style.transitionDelay = (siblings * 0.08) + 's';
        el.classList.add('seen');
        io.unobserve(el);
      });
    }, { threshold: 0.15 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('seen'); });
  }

  // ---------------------------------------------------------------- Diaporama
  var slides = document.querySelectorAll('#slides img');
  var dotsBox = document.getElementById('dots');
  var caption = document.getElementById('caption');
  var cur = 0, timer = 0;
  var dots = Array.prototype.map.call(slides, function (img, k) {
    var d = document.createElement('button');
    d.setAttribute('aria-label', img.dataset.caption);
    d.addEventListener('click', function () { show(k, true); });
    dotsBox.appendChild(d);
    return d;
  });
  function show(k, byHand) {
    cur = (k + slides.length) % slides.length;
    slides.forEach(function (img, j) { img.classList.toggle('on', j === cur); });
    dots.forEach(function (d, j) { d.classList.toggle('on', j === cur); });
    caption.textContent = slides[cur].dataset.caption;
    if (byHand) tone(660 + cur * 60, 0.12, 0, 'triangle');
    clearInterval(timer);
    if (!calm) timer = setInterval(function () { show(cur + 1); }, byHand ? 7000 : 4500);
  }
  document.getElementById('prev').addEventListener('click', function () { show(cur - 1, true); });
  document.getElementById('next').addEventListener('click', function () { show(cur + 1, true); });
  // Glisser du doigt sur la tablette
  var startX = null;
  var viewer = document.querySelector('.viewer');
  viewer.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
  viewer.addEventListener('touchend', function (e) {
    if (startX === null) return;
    var dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) show(cur + (dx < 0 ? 1 : -1), true);
    startX = null;
  });
  show(0);

  // ---------------------------------------------------------------- Confettis au téléchargement
  var cv = document.getElementById('confetti'), ctx = cv.getContext('2d'), parts = [], running = false;
  function confetti(x, y) {
    cv.width = innerWidth;
    cv.height = innerHeight;
    for (var k = 0; k < 120; k++) {
      parts.push({
        x: x, y: y, vx: (Math.random() - 0.5) * 900, vy: -300 - Math.random() * 700,
        s: 7 + Math.random() * 9, r: Math.random() * 6, vr: (Math.random() - 0.5) * 12,
        c: COLORS[k % COLORS.length], life: 1.8 + Math.random()
      });
    }
    if (running) return;
    running = true;
    var last = performance.now();
    requestAnimationFrame(function step(now) {
      var dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (var k = parts.length - 1; k >= 0; k--) {
        var p = parts[k];
        p.life -= dt;
        if (p.life <= 0) { parts.splice(k, 1); continue; }
        p.vy += 1200 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.r += p.vr * dt;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        ctx.restore();
      }
      if (parts.length) requestAnimationFrame(step);
      else { running = false; ctx.clearRect(0, 0, cv.width, cv.height); }
    });
  }
  document.querySelectorAll('.download').forEach(function (a) {
    a.addEventListener('click', function () {
      var r = a.getBoundingClientRect();
      if (!calm) confetti(r.left + r.width / 2, r.top + r.height / 2);
      [523, 659, 784, 1047].forEach(function (f, k) { tone(f, 0.3, k * 0.1, 'triangle'); });
    });
  });

})();
