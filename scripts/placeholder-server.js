// Placeholder dev server for Lovable's preview harness.
// This workspace hosts three sub-projects (Qikzo-app / Quikzo-rider Expo apps
// + qikzo-server Express API); there is no root web app to serve, so this
// script just keeps a health endpoint alive on the port the harness passes.
const http = require('http');
const args = process.argv.slice(2);
let port = Number(process.env.PORT) || 8080;
const i = args.indexOf('--port');
if (i !== -1 && args[i + 1]) port = Number(args[i + 1]);

const html = `<!doctype html><meta charset=utf-8><title>Qikzo workspace</title>
<style>body{font-family:system-ui;padding:32px;max-width:640px;margin:auto;line-height:1.5;color:#111}</style>
<h1>Qikzo workspace</h1>
<p>This project contains three apps:</p>
<ul>
  <li><b>Qikzo-app</b> — Expo customer app (<code>cd Qikzo-app && npm start</code>)</li>
  <li><b>Quikzo-rider</b> — Expo rider app (<code>cd Quikzo-rider && npm start</code>)</li>
  <li><b>qikzo-server</b> — Node/Express API (<code>cd qikzo-server && npm run dev</code>)</li>
</ul>
<p>The Lovable web preview does not render mobile apps — use Expo Go or an emulator.</p>`;

http.createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(html);
}).listen(port, () => console.log(`placeholder server on :${port}`));
