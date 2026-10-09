const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const HTML_FILE = path.join(__dirname, 'recipe-generator (2).html');

const server = http.createServer((req, res) => {
  // Proxy API calls to Anthropic, injecting the API key server-side
  if (req.url.startsWith('/api/v1/messages')) {
    let body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', () => {
      const payload = Buffer.concat(body);
      const options = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'Content-Length': Buffer.byteLength(payload),
        },
      };
      const proxy = https.request(options, apiRes => {
        res.writeHead(apiRes.statusCode, { 'Content-Type': 'application/json' });
        apiRes.pipe(res);
      });
      proxy.on('error', () => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'Proxy error contacting Anthropic API' } }));
      });
      proxy.write(payload);
      proxy.end();
    });
    return;
  }

  // Serve the static HTML file
  if (req.url === '/' || req.url === '/index.html') {
    fs.readFile(HTML_FILE, (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Server error');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Pantry server running on http://0.0.0.0:${PORT}`);
});
