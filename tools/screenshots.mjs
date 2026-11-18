// Captures d'écran des jeux pour le site de téléchargement.
// Prérequis : `node tools/serve.js` qui tourne, et Google Chrome installé.
//   node tools/screenshots.mjs
// Pilote Chrome sans fenêtre via le protocole DevTools (aucune dépendance npm).
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'site', 'img');
const BASE = 'http://localhost:8123/';
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9333;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Petites aides injectées dans la page pour simuler des doigts
const HELPERS = `
  window.__tap = (el, x, y) => {
    const o = { clientX: x, clientY: y, pointerId: 1, bubbles: true };
    el.dispatchEvent(new PointerEvent('pointerdown', o));
    el.dispatchEvent(new PointerEvent('pointerup', o));
  };
  window.__wait = (ms) => new Promise((r) => setTimeout(r, ms));
`;

// Coloriage de la maison : [x, y dans le dessin 400x300, indice de couleur]
const FILLS = [[20, 20, 6], [345, 55, 2], [200, 285, 4], [236, 100, 14], [130, 215, 1], [185, 120, 0],
  [184, 215, 14], [321, 215, 13], [321, 140, 5], [40, 250, 11], [70, 262, 2],
  [130, 170, 7], [148, 170, 7], [130, 188, 7], [148, 188, 7], [222, 170, 7], [240, 170, 7], [222, 188, 7], [240, 188, 7]];

const SHOTS = [
  { name: 'menu', hash: '', wait: 1800 },
  {
    name: 'coloriage', hash: 'coloring', wait: 1000, script: `
      const cv = document.querySelector('.coloring canvas'), r = cv.getBoundingClientRect();
      const rw = Math.min(r.width, r.height * 4 / 3), rh = rw * 3 / 4;
      const ox = r.left + (r.width - rw) / 2, oy = r.top + (r.height - rh) / 2;
      document.querySelectorAll('.toolgroup .round-btn')[0].dispatchEvent(new PointerEvent('pointerdown'));
      for (const [x, y, c] of ${JSON.stringify(FILLS)}) {
        document.querySelectorAll('.swatch')[c].dispatchEvent(new PointerEvent('pointerdown'));
        __tap(cv, ox + x / 400 * rw, oy + y / 300 * rh);
        await __wait(450);
      }
      document.querySelectorAll('.swatch')[11].dispatchEvent(new PointerEvent('pointerdown'));`
  },
  { name: 'puzzle', hash: 'puzzle', wait: 1500 },
  {
    name: 'animaux', hash: 'animals', wait: 800, script: `
      document.querySelectorAll('.animal')[0].dispatchEvent(new PointerEvent('pointerdown'));
      await __wait(450);`
  },
  { name: 'bulles', hash: 'bubbles', wait: 3500 },
  {
    name: 'piano', hash: 'piano', wait: 800, script: `
      const keys = document.querySelectorAll('.key');
      for (const i of [1, 3, 5, 6]) {
        const r = keys[i].getBoundingClientRect();
        __tap(document.querySelector('.piano'), r.left + r.width / 2, r.top + r.height / 2);
        await __wait(160);
      }`
  },
  { name: 'memory', hash: 'memory', wait: 900, before: `localStorage.setItem('yaya.memory.level', '1');` },
  {
    name: 'compter', hash: 'count', wait: 1200, before: `localStorage.setItem('yaya.count.level', '1');`, script: `
      const items = document.querySelectorAll('.count-item');
      for (let i = 0; i < Math.max(0, items.length - 1); i++) {
        items[i].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        await new Promise((r) => setTimeout(r, 150));
      }
    `
  },
  {
    name: 'ombres', hash: 'shadows', wait: 1200, before: `localStorage.setItem('yaya.shadows.level', '1');`, script: `
      const p = document.querySelector('.sh-piece');
      p.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, clientX: 0, clientY: 0 }));
      window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1, clientX: 0, clientY: 0 }));
    `
  }
];

async function main() {
  mkdirSync(OUT, { recursive: true });
  const profile = join(tmpdir(), 'yaya-shots-profile');
  rmSync(profile, { recursive: true, force: true });
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
    '--hide-scrollbars', '--mute-audio', '--window-size=1280,800', 'about:blank'], { stdio: 'ignore' });

  let target;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(200);
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      target = list.find((t) => t.type === 'page');
    } catch { /* Chrome démarre encore */ }
  }
  if (!target) throw new Error('Chrome ne répond pas');

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const n = ++id;
    pending.set(n, (m) => (m.error ? reject(new Error(method + ': ' + m.error.message)) : resolve(m.result)));
    ws.send(JSON.stringify({ id: n, method, params }));
  });
  const run = (code) => send('Runtime.evaluate', { expression: `(async () => { ${code} })()`, awaitPromise: true });

  // Tablette 16:10, rendu net (x1.5)
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1.5, mobile: false });

  let n = 0;
  for (const shot of SHOTS) {
    await send('Page.navigate', { url: BASE });
    await sleep(600);
    if (shot.before) await run(shot.before);
    await send('Page.navigate', { url: `${BASE}?s=${++n}#${shot.hash}` });
    await sleep(shot.wait);
    await run(HELPERS);
    if (shot.script) await run(shot.script);
    const { data } = await send('Page.captureScreenshot', { format: 'webp', quality: 82 });
    writeFileSync(join(OUT, `${shot.name}.webp`), Buffer.from(data, 'base64'));
    console.log('ok', shot.name);
  }
  ws.close();
  chrome.kill();
}

main().catch((e) => { console.error(e); process.exit(1); });
