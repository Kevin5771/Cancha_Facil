const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { spawn } = require('node:child_process');
const path = require('node:path');

function run(script, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], {
      cwd: path.join(__dirname, '..'), env: { ...process.env, ...env },
      windowsHide: true,
    });
    let output = '';
    child.stdout.on('data', data => output += data);
    child.stderr.on('data', data => output += data);
    const timeout = setTimeout(() => { child.kill(); reject(new Error('El arranque no terminó.')); }, 15000);
    child.on('error', reject);
    child.on('exit', code => { clearTimeout(timeout); resolve({ code, output }); });
  });
}

test('arranque detecta instancia existente y rechaza otro servicio sin una excepción de Node', async () => {
  let ours = true;
  const server = http.createServer((req, res) => {
    if (!ours) { res.end('<html>Otra aplicación</html>'); return; }
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(req.url === '/api/health' ? { app: 'CanchaFácil' } : []));
  });
  await new Promise(resolve => server.listen(0, resolve));
  const env = { PORT: String(server.address().port), DATABASE_URL: 'postgresql://localhost:5432/test' };
  try {
    const existing = await run('scripts/start-local.js', env);
    assert.equal(existing.code, 0);
    assert.match(existing.output, /ya está funcionando/);
    ours = false;
    const occupied = await run('scripts/start-local.js', env);
    assert.equal(occupied.code, 1);
    assert.match(occupied.output, /ocupado por otra aplicación/);
    assert.doesNotMatch(occupied.output, /Unhandled|SyntaxError/);
    const direct = await run('src/server.js', { ...env, JWT_SECRET: 'x'.repeat(40) });
    assert.equal(direct.code, 1);
    assert.match(direct.output, /puerto .* ocupado/);
    assert.doesNotMatch(direct.output, /Unhandled/);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('PORT inválido produce un mensaje claro', async () => {
  const result = await run('scripts/start-local.js', { PORT: 'incorrecto' });
  assert.equal(result.code, 1);
  assert.match(result.output, /PORT debe ser/);
});
