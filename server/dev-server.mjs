// Local server: serves the app and the /api/chat bridge.
//   OPENAI_API_KEY=sk-... node server/dev-server.mjs
// Then open http://localhost:8787
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleChat } from './prompt.js';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const PORT = Number(process.env.PORT || 8787);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.md': 'text/markdown; charset=utf-8',
};

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/chat' && req.method === 'POST') {
    if (process.env.APP_PASSCODE && req.headers['x-app-passcode'] !== process.env.APP_PASSCODE) {
      res.writeHead(401, { 'Content-Type': 'application/json' }); return res.end('{"error":"bad passcode"}');
    }
    let raw = '';
    for await (const chunk of req) raw += chunk;
    try {
      const reply = await handleChat(JSON.parse(raw || '{}'), {
        apiKey: process.env.OPENAI_API_KEY || 'proxy-injected', model: process.env.OPENAI_MODEL || 'gpt-5.5',
      });
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ reply }));
    } catch (e) {
      console.error(e);
      res.writeHead(502, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: String(e.message || e) }));
    }
    return;
  }
  let p = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  if (p.endsWith('/')) p += 'index.html';
  const file = join(ROOT, p);
  if (!file.startsWith(ROOT) || /[/\\](server|tools|\.git)([/\\]|$)/.test(p)) { res.writeHead(404); return res.end(); }
  try {
    if (!(await stat(file)).isFile()) throw new Error();
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(PORT, () => console.log(`Cloud Cat running at http://localhost:${PORT}`));
