import { createServer } from 'https';
import { readFileSync } from 'fs';
import { request as httpRequest } from 'http';
import { parse } from 'url';
import next from 'next';

const dev = true;
const hostname = '0.0.0.0';
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const httpsOptions = {
  key: readFileSync('../../certs/key.pem'),
  cert: readFileSync('../../certs/cert.pem'),
};

/**
 * Raw TCP-level WebSocket proxy.
 * Forwards the HTTP upgrade request to the backend and then pipes
 * the raw sockets in both directions — no frame parsing at all.
 */
function proxyWsRaw(req, clientSocket, head) {
  const { pathname, search } = parse(req.url);
  const targetPath = `${pathname}${search || ''}`;

  const proxyReq = httpRequest({
    hostname: 'localhost',
    port: 8000,
    path: targetPath,
    method: 'GET',
    headers: Object.fromEntries(
      Object.entries(req.headers)
        .filter(([k]) => k.toLowerCase() !== 'sec-websocket-extensions')
        .concat([['host', 'localhost:8000']])
    ),
  });

  proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
    // Build the raw HTTP 101 response to send back to client
    let responseHead = 'HTTP/1.1 101 Switching Protocols\r\n';
    for (const [key, value] of Object.entries(proxyRes.headers)) {
      if (Array.isArray(value)) {
        for (const v of value) responseHead += `${key}: ${v}\r\n`;
      } else {
        responseHead += `${key}: ${value}\r\n`;
      }
    }
    responseHead += '\r\n';

    clientSocket.write(responseHead);
    if (proxyHead.length > 0) clientSocket.write(proxyHead);
    if (head.length > 0) proxySocket.write(head);

    // Pipe raw TCP in both directions
    proxySocket.pipe(clientSocket);
    clientSocket.pipe(proxySocket);

    proxySocket.on('error', () => clientSocket.destroy());
    clientSocket.on('error', () => proxySocket.destroy());
    proxySocket.on('close', () => clientSocket.destroy());
    clientSocket.on('close', () => proxySocket.destroy());
  });

  proxyReq.on('error', (err) => {
    console.error('WS proxy error:', err.message);
    clientSocket.destroy();
  });

  // If backend rejects (non-101), forward the rejection
  proxyReq.on('response', (res) => {
    let head = `HTTP/1.1 ${res.statusCode} ${res.statusMessage}\r\n`;
    for (const [key, value] of Object.entries(res.headers)) {
      head += `${key}: ${value}\r\n`;
    }
    head += '\r\n';
    clientSocket.write(head);
    res.pipe(clientSocket);
  });

  proxyReq.end();
}

app.prepare().then(() => {
  const server = createServer(httpsOptions, async (req, res) => {
    const parsedUrl = parse(req.url, true);
    await handle(req, res, parsedUrl);
  });

  server.on('listening', () => {
    const existingListeners = server.listeners('upgrade').slice();
    server.removeAllListeners('upgrade');

    server.on('upgrade', (req, socket, head) => {
      const { pathname } = parse(req.url);

      if (pathname && pathname.startsWith('/api/')) {
        console.log('WS proxy:', pathname);
        proxyWsRaw(req, socket, head);
        return;
      }

      // HMR and other Next.js upgrades
      for (const listener of existingListeners) {
        listener.call(server, req, socket, head);
      }
    });
  });

  server.listen(port, hostname, () => {
    console.log(`> Ready on https://${hostname}:${port}`);
  });
});
