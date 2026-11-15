// Petit serveur local pour tester dans le navigateur du PC :
//   node tools/serve.js              les jeux  -> http://localhost:8123
//   node tools/serve.js site 8124    le site   -> http://localhost:8124
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOTS = { www: path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'www'), site: path.join(__dirname, '..', 'site') };
const root = ROOTS[process.argv[2] || 'www'];
const port = Number(process.argv[3]) || 8123;
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2'
};

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const file = path.join(root, url === '/' ? 'index.html' : url);
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('introuvable'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
}).listen(port, () => console.log('http://localhost:' + port));
