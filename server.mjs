import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
const publicFiles = new Set(['/index.html','/style.css','/main.js','/game.js','/credits.js']);
const port = Number(process.env.PORT || 5174);

http.createServer(async (req,res) => {
  try {
    if (req.url === '/api/credits-rpc' && req.method === 'POST') {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 10000) { res.writeHead(413).end(); return; }
      }
      const upstream = await fetch('https://ethereum-rpc.publicnode.com', {
        method:'POST', headers:{'Content-Type':'application/json'}, body,
        signal:AbortSignal.timeout(25000)
      });
      res.writeHead(upstream.status, {'Content-Type':'application/json'});
      res.end(await upstream.text());
      return;
    }
    if (req.method !== 'GET') {res.writeHead(405).end(); return;}
    const requested = req.url === '/' ? '/index.html' : decodeURIComponent(req.url.split('?')[0]);
    if (!publicFiles.has(requested)) {res.writeHead(404).end('Not found'); return;}
    const filename = path.resolve(root,'.'+requested);
    if (!filename.startsWith(root+path.sep)) {res.writeHead(403).end(); return;}
    const contents = await readFile(filename);
    res.writeHead(200,{'Content-Type':types[path.extname(filename)] || 'application/octet-stream'});
    res.end(contents);
  } catch (error) {
    res.writeHead(error.code === 'ENOENT' ? 404 : 502).end(error.code === 'ENOENT' ? 'Not found' : 'Service unavailable');
  }
}).listen(port, () => console.log(`Cretris → http://127.0.0.1:${port}`));
