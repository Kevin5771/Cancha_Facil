const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

// Estas pruebas no ejecutan consultas. Nunca requieren una base real.
process.env.DATABASE_URL = "postgres://test:test@127.0.0.1:1/canchafacil_test";
process.env.JWT_SECRET =
  "secreto-exclusivo-de-pruebas-con-mas-de-32-caracteres";
const { createApp } = require("../src/app");
const { pool } = require("../src/infrastructure/database/postgres");

test("contrato HTTP después de reorganizar módulos", async (t) => {
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(async () => {
    await new Promise((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
    await pool.end();
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  await t.test("health y frontend siguen disponibles", async () => {
    const response = await fetch(`${base}/api/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      estado: "ok",
      app: "CanchaFácil",
    });
    assert.equal((await fetch(base)).status, 200);
  });
  await t.test(
    "las rutas protegidas rechazan solicitudes sin sesión",
    async () => {
      for (const path of [
        "/api/auth/me",
        "/api/reservaciones/mias",
        "/api/admin/resumen",
        "/api/horarios?cancha_id=1",
        "/api/canchas/admin",
        "/api/comunidad/canchas/1/calificacion",
      ]) {
        assert.equal((await fetch(base + path)).status, 401, path);
      }
    },
  );
  await t.test("un cliente no accede a administración", async () => {
    const token = jwt.sign(
      { sub: "7", rol: "CLIENTE" },
      process.env.JWT_SECRET,
    );
    assert.equal(
      (
        await fetch(`${base}/api/admin/resumen`, {
          headers: { cookie: `cf_sesion=${token}` },
        })
      ).status,
      403,
    );
  });
  await t.test("se conservan validaciones, origen y errores API", async () => {
    const registro = await fetch(`${base}/api/auth/registro`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    assert.equal(registro.status, 400);
    const externo = await fetch(`${base}/api/auth/logout`, {
      method: "POST",
      headers: { origin: "https://otro-sitio.example" },
    });
    assert.equal(externo.status, 403);
    assert.equal((await fetch(`${base}/api/no-existe`)).status, 404);
  });
});
