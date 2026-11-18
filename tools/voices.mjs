// Génère les phrases préenregistrées du narrateur (voix d'enfant naturelle).
// Prérequis : `node tools/serve.js` qui tourne, Google Chrome, Python avec edge-tts
// (`pip install --user edge-tts`) et ffmpeg (variable FFMPEG si ffmpeg n'est pas dans le PATH).
//   node tools/voices.mjs
// 1. ouvre l'appli dans Chrome sans fenêtre et récupère toutes les phrases (App.allLines())
// 2. fait dire chaque nouvelle phrase par la voix fr-FR-EloiseNeural (edge-tts)
// 3. coupe les silences, compresse en mp3 mono -> www/voice/<nom>.mp3
// 4. écrit www/js/voice-index.js (phrase -> fichier) et supprime les fichiers inutilisés
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WWW = join(ROOT, 'app', 'src', 'main', 'assets', 'www');
const OUT = join(WWW, 'voice');
const BASE = 'http://localhost:8123/';
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const VOICE = process.env.VOICE || 'fr-FR-EloiseNeural';
const RATE = '-6%';
const PORT = 9334;
const run = promisify(execFile);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Nom de fichier lisible et stable : « C'est la vache ! » -> c-est-la-vache-1a2b3c
function fileName(text) {
  const slug = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  return slug + '-' + createHash('md5').update(text).digest('hex').slice(0, 6);
}

async function readLines() {
  const profile = join(tmpdir(), 'yaya-voices-profile');
  rmSync(profile, { recursive: true, force: true });
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
    '--mute-audio', BASE], { stdio: 'ignore' });
  try {
    let target;
    for (let i = 0; i < 50 && !target; i++) {
      await sleep(200);
      try {
        const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
        target = list.find((t) => t.type === 'page' && t.url.startsWith(BASE));
      } catch { /* Chrome démarre encore */ }
    }
    if (!target) throw new Error('Chrome ne répond pas (node tools/serve.js est lancé ?)');
    await sleep(1000);
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((r) => ws.addEventListener('open', r));
    const res = await new Promise((resolve) => {
      ws.addEventListener('message', (e) => resolve(JSON.parse(e.data)));
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: 'JSON.stringify(App.allLines())' } }));
    });
    ws.close();
    return JSON.parse(res.result.result.value);
  } finally {
    chrome.kill();
  }
}

async function make(text, file) {
  const raw = join(tmpdir(), file + '.raw.mp3');
  await run('python', ['-m', 'edge_tts', '--voice', VOICE, `--rate=${RATE}`, '--text', text, '--write-media', raw]);
  // silences coupés au début et à la fin, mono, mp3 léger
  const trim = 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,' +
    'silenceremove=start_periods=1:start_threshold=-45dB,areverse,afade=t=in:d=0.01';
  await run(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-i', raw, '-ac', '1', '-ar', '24000',
    '-af', trim, '-c:a', 'libmp3lame', '-b:a', '40k', join(OUT, file + '.mp3')]);
  rmSync(raw, { force: true });
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const lines = await readLines();
  const index = {};
  const todo = [];
  for (const t of lines) {
    const f = fileName(t);
    index[t] = f;
    if (!existsSync(join(OUT, f + '.mp3'))) todo.push([t, f]);
  }
  console.log(lines.length + ' phrases, ' + todo.length + ' à générer');
  // 4 à la fois
  let done = 0;
  async function worker() {
    while (todo.length) {
      const [t, f] = todo.shift();
      for (let essai = 1; ; essai++) {
        try { await make(t, f); break; } catch (e) {
          if (essai >= 3) throw new Error('Échec pour « ' + t + ' » : ' + e.message);
          await sleep(2000 * essai);
        }
      }
      if (++done % 20 === 0) console.log('  ' + done + '…');
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()]);

  // fichiers qui ne servent plus
  const used = new Set(Object.values(index).map((f) => f + '.mp3'));
  for (const f of readdirSync(OUT)) if (f.endsWith('.mp3') && !used.has(f)) rmSync(join(OUT, f));

  writeFileSync(join(WWW, 'js', 'voice-index.js'),
    '// Fichier généré par tools/voices.mjs : phrase -> voice/<fichier>.mp3 (voix ' + VOICE + ')\n' +
    'var VOICE = ' + JSON.stringify(index, null, 1) + ';\n');
  console.log('ok : ' + Object.keys(index).length + ' phrases dans js/voice-index.js');
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
