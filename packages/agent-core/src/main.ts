/**
 * Away — minimal Agent Core–compatible HTTP stub.
 * Replace with Bedrock Agent Core + Strands (or your framework) per packages/agent-core/README.md
 */
import http from 'node:http';

const PORT = Number(process.env.AGENT_PORT ?? 8787);

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/ping') {
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('ok');
    return;
  }

  if (req.method === 'POST' && req.url === '/invocations') {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8');
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify({
          message: 'Away stub — wire Bedrock Agent Core handler here',
          hint: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-get-started-toolkit-typescript.html',
          bytesIn: body.length,
        })
      );
    });
    return;
  }

  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('not found');
});

server.listen(PORT, () => {
  console.log(`Away (stub) http://localhost:${PORT} — GET /ping | POST /invocations`);
});
