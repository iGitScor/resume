import { readFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, normalize } from 'node:path';

const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

// Minimal static server for local preview and PDF rendering; port 0 picks a free one.
export function serve(dir: string, port = 0): Promise<{ server: Server; url: string }> {
  const server = createServer(async (request, response) => {
    const { pathname } = new URL(request.url ?? '/', 'http://localhost');
    const path = join(dir, normalize(decodeURIComponent(pathname)));
    const file = pathname.endsWith('/') ? join(path, 'index.html') : path;

    try {
      const body = await readFile(file);
      response.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
      response.end(body);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EISDIR') {
        response.writeHead(301, { location: `${pathname}/` });
        response.end();
        return;
      }
      response.writeHead(404, { 'content-type': 'text/plain' });
      response.end('Not found');
    }
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      resolve({ server, url: `http://127.0.0.1:${(server.address() as AddressInfo).port}` });
    });
  });
}
