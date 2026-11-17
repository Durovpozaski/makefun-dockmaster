// DOCKMASTER local static server (Node 22, standard library only).
// Serves this directory so game/index.html plays offline in a browser:
//   node serve.ts [--port 8080]
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Directory of this file, without a trailing slash, so the root guard
// below compares paths correctly.
const here = fileURLToPath(new URL('.', import.meta.url)).replace(/\/$/, '');
const port = Number(process.argv[process.argv.indexOf('--port') + 1] || 8080);
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    let path = normalize(join(here, decodeURIComponent(url.pathname)));
    if (!path.startsWith(here + sep) && path !== here) throw new Error('outside root');
    if (path.endsWith(sep)) path = join(path, 'index.html');
    if (path === join(here, 'game')) path = join(path, 'index.html');
    const body = await readFile(path);
    res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' });
    res.end(body);
  } catch (err) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
  }
}).listen(port, () => console.log('DOCKMASTER serving http://localhost:' + port));
