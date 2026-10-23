require("dotenv").config();
const { chromium, expect } = require("@playwright/test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { pool } = require("../src/infrastructure/database/postgres");
const { fechaHoyLocal, diaSemanaISO } = require("../src/shared/validation");
const base = "http://localhost:3000";
const output = path.resolve(__dirname, "../.local/walkthrough");
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch();
  const admin = await browser.newContext({
    viewport: { width: 1440, height: 1080 },
    reducedMotion: "reduce",
  });
  const client = await browser.newContext();
  const other = await browser.newContext();
  const guest = await browser.newContext();
  const cases = [];
  let courtId, userId;
  const suffix = crypto.randomBytes(5).toString("hex");
  const email = `verificacion-${suffix}@example.com`;
  async function call(context, method, url, data, status) {
    const response = await context.request.fetch(base + url, { method, data });
    const body = await response.json();
    assert.equal(
      response.status(),
      status,
      `${method} ${url}: ${body.error || response.status()}`,
    );
    return body;
  }
  const pass = (id, detail) => {
    cases.push({ id, resultado: "Aprobado", detalle: detail });
    console.log(`${id}: ${detail}`);
  };
  try {
    const registration = await call(
      client,
      "POST",
      "/api/auth/registro",
      {
        nombre: "Cliente de verificación",
        correo: email,
        password: crypto.randomBytes(18).toString("hex"),
      },
      201,
    );
    userId = registration.usuario.id;
    await call(
      guest,
      "POST",
      "/api/auth/registro",
      { nombre: "Duplicado", correo: email, password: "ClaveDePrueba123!" },
      409,
    );
    await call(
      guest,
      "POST",
      "/api/auth/login",
      { correo: email, password: "incorrecta" },
      401,
    );
    await call(guest, "GET", "/api/admin/resumen", undefined, 401);
    await call(client, "GET", "/api/admin/resumen", undefined, 403);
    pass(
      "PM-01/02/15",
      "Registro, duplicado, credenciales inválidas y control de roles.",
    );
    await call(
      admin,
      "POST",
      "/api/auth/login",
      { correo: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
      200,
    );
    const demo = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, "../.local/clientes-demo.json"),
        "utf8",
      ),
    );
    await call(
      other,
      "POST",
      "/api/auth/login",
      { correo: demo.clientes[1].correo, password: demo.password },
      200,
    );
    const page = await admin.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(base);
    await page.locator(".admin-menu summary").click();
    await page.locator('.admin-menu [data-view="canchas-admin"]').click();
    await page.locator('#form-cancha button[type="submit"]').click();
    await expect(page.locator("#can-nombre")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(
      page.locator("#form-cancha .field-error").first(),
    ).toBeVisible();
    const name = `Verificación administrativa ${suffix}`;
    await page.locator("#can-nombre").fill(name);
    await page.locator("#can-tipo").fill("Fútbol 5");
    await page.locator("#can-desc").fill("Cancha temporal de integración.");
    await page.locator("#can-tarifa").fill("200");
    let postCount = 0;
    page.on("request", (request) => {
      if (
        request.url() === base + "/api/canchas" &&
        request.method() === "POST"
      )
        postCount++;
    });
    await page.route(base + "/api/canchas", async (route) => {
      if (route.request().method() === "POST")
        await new Promise((resolve) => setTimeout(resolve, 300));
      await route.continue();
    });
    const created = page.waitForResponse(
      (response) =>
        response.url() === base + "/api/canchas" &&
        response.request().method() === "POST",
    );
    await page.evaluate(() => {
      const form = document.getElementById("form-cancha");
      form.requestSubmit();
      form.requestSubmit();
    });
    await expect(page.locator('#form-cancha button[type="submit"]')).toHaveText(
      "Guardando…",
    );
    const result = await created;
    assert.equal(result.status(), 201);
    courtId = (await result.json()).cancha.id;
    assert.equal(postCount, 1);
    await page
      .locator(`[data-action="editar-cancha"][data-id="${courtId}"]`)
      .click();
    await page.locator("#can-tarifa").fill("-1");
    await page.locator('#form-cancha button[type="submit"]').click();
    await expect(page.locator("#can-tarifa")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await page.locator("#can-tarifa").fill("149.50");
    await page.locator("#can-nombre").fill(name + " editada");
    await page.locator("#can-tipo").fill("Tenis");
    await page
      .locator("#can-desc")
      .fill("Datos actualizados y conservados ante un fallo.");
    await page.locator("#can-activa").uncheck();
    await page.route(base + `/api/canchas/${courtId}`, (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: "No se pudo guardar en este momento. Inténtalo de nuevo.",
        }),
      }),
    );
    await page.locator('#form-cancha button[type="submit"]').click();
    await expect(page.locator("#form-cancha .form-feedback")).toContainText(
      "No se pudo guardar",
    );
    await expect(page.locator("#can-nombre")).toHaveValue(name + " editada");
    await expect(
      page.locator('#form-cancha button[type="submit"]'),
    ).toBeEnabled();
    await page.screenshot({
      path: path.join(output, "formulario_error_conserva_datos.png"),
      fullPage: true,
    });
    await page.unroute(base + `/api/canchas/${courtId}`);
    const updated = page.waitForResponse(
      (r) =>
        r.url() === base + `/api/canchas/${courtId}` &&
        r.request().method() === "PUT",
    );
    await page.locator('#form-cancha button[type="submit"]').click();
    assert.equal((await updated).status(), 200);
    let catalog = await call(guest, "GET", "/api/canchas", undefined, 200);
    assert.equal(
      catalog.canchas.some((c) => String(c.id) === String(courtId)),
      false,
    );
    await page.reload();
    await page.locator(".admin-menu summary").click();
    await page.locator('.admin-menu [data-view="canchas-admin"]').click();
    await page
      .locator(`[data-action="editar-cancha"][data-id="${courtId}"]`)
      .click();
    await expect(page.locator("#can-nombre")).toHaveValue(name + " editada");
    await expect(page.locator("#can-tipo")).toHaveValue("Tenis");
    await expect(page.locator("#can-tarifa")).toHaveValue("149.50");
    await expect(page.locator("#can-activa")).not.toBeChecked();
    await page.locator("#can-activa").check();
    const activated = page.waitForResponse(
      (r) =>
        r.url() === base + `/api/canchas/${courtId}` &&
        r.request().method() === "PUT",
    );
    await page.locator('#form-cancha button[type="submit"]').click();
    await activated;
    catalog = await call(guest, "GET", "/api/canchas", undefined, 200);
    assert.equal(
      catalog.canchas.some((c) => String(c.id) === String(courtId)),
      true,
    );
    pass(
      "PM-03/09",
      "Crear, editar todos los campos, persistir tras recarga, desactivar y reactivar cancha; validación visible y un solo envío.",
    );
    const date = new Date(fechaHoyLocal() + "T12:00:00Z");
    date.setUTCDate(date.getUTCDate() + 1);
    const tomorrow = date.toISOString().slice(0, 10);
    const day = diaSemanaISO(tomorrow);
    const slot = async (start, end, status = 201) =>
      call(
        admin,
        "POST",
        "/api/horarios",
        {
          cancha_id: courtId,
          dia_semana: day,
          hora_inicio: start,
          hora_fin: end,
        },
        status,
      );
    const first = (await slot("08:00", "09:00")).horario;
    const second = (await slot("09:00", "10:00")).horario;
    await slot("08:30", "09:30", 409);
    await call(
      admin,
      "PATCH",
      `/api/horarios/${first.id}/estado`,
      { activo: false },
      200,
    );
    const availability = () =>
      call(
        guest,
        "GET",
        `/api/canchas/${courtId}/disponibilidad?fecha=${tomorrow}`,
        undefined,
        200,
      );
    assert.equal(
      (await availability()).horarios.some(
        (h) => String(h.id) === String(first.id),
      ),
      false,
    );
    await call(
      client,
      "POST",
      "/api/reservaciones",
      { cancha_id: courtId, horario_id: first.id, fecha: tomorrow },
      400,
    );
    await call(
      admin,
      "PATCH",
      `/api/horarios/${first.id}/estado`,
      { activo: true },
      200,
    );
    await call(
      admin,
      "PATCH",
      `/api/horarios/${second.id}/estado`,
      { activo: false },
      200,
    );
    const middle = (await slot("09:15", "09:45")).horario;
    await call(
      admin,
      "PATCH",
      `/api/horarios/${second.id}/estado`,
      { activo: true },
      409,
    );
    await call(
      admin,
      "PATCH",
      `/api/horarios/${middle.id}/estado`,
      { activo: false },
      200,
    );
    await call(
      admin,
      "PATCH",
      `/api/horarios/${second.id}/estado`,
      { activo: true },
      200,
    );
    const races = await Promise.all([
      admin.request.post(base + "/api/horarios", {
        data: {
          cancha_id: courtId,
          dia_semana: day,
          hora_inicio: "10:00",
          hora_fin: "11:00",
        },
      }),
      admin.request.post(base + "/api/horarios", {
        data: {
          cancha_id: courtId,
          dia_semana: day,
          hora_inicio: "10:30",
          hora_fin: "11:30",
        },
      }),
    ]);
    assert.deepEqual(races.map((r) => r.status()).sort(), [201, 409]);
    pass(
      "PM-04/10",
      "Franjas consecutivas, cruces rechazados, bloqueo, reactivación y exclusión concurrente de horarios.",
    );
    const payload = {
      cancha_id: courtId,
      horario_id: first.id,
      fecha: tomorrow,
    };
    const requests = await Promise.all([
      client.request.post(base + "/api/reservaciones", { data: payload }),
      other.request.post(base + "/api/reservaciones", { data: payload }),
    ]);
    assert.deepEqual(requests.map((r) => r.status()).sort(), [201, 409]);
    const winner = requests[0].status() === 201 ? client : other;
    const loser = winner === client ? other : client;
    const reservation = (await requests.find((r) => r.status() === 201).json())
      .reservacion;
    await call(
      loser,
      "PATCH",
      `/api/reservaciones/${reservation.id}/cancelar`,
      {},
      404,
    );
    const own = await call(
      client,
      "GET",
      "/api/reservaciones/mias",
      undefined,
      200,
    );
    if (own.reservaciones.length) {
      const foreign = await pool.query(
        "SELECT count(*)::int AS total FROM reservaciones WHERE id=ANY($1::bigint[]) AND cliente_id<>$2",
        [own.reservaciones.map((r) => r.id), userId],
      );
      assert.equal(foreign.rows[0].total, 0);
    }
    const filtered = await call(
      admin,
      "GET",
      `/api/admin/reservaciones?cancha_id=${courtId}&fecha=${tomorrow}&estado=PENDIENTE`,
      undefined,
      200,
    );
    assert.equal(filtered.reservaciones.length, 1);
    const byName = await call(
      admin,
      "GET",
      `/api/admin/reservaciones?cancha_id=${courtId}&cliente=${encodeURIComponent(filtered.reservaciones[0].cliente)}`,
      undefined,
      200,
    );
    assert.equal(byName.reservaciones.length, 1);
    const unfiltered = await call(
      admin,
      "GET",
      "/api/admin/reservaciones",
      undefined,
      200,
    );
    assert.equal(
      unfiltered.reservaciones.some(
        (r) => String(r.id) === String(reservation.id),
      ),
      true,
    );
    for (const account of [client, other]) {
      const me = (await call(account, "GET", "/api/auth/me", undefined, 200))
        .usuario;
      const listing = await call(
        account,
        "GET",
        "/api/reservaciones/mias",
        undefined,
        200,
      );
      const expected = await pool.query(
        "SELECT id::text FROM reservaciones WHERE cliente_id=$1 ORDER BY id",
        [me.id],
      );
      assert.deepEqual(
        listing.reservaciones.map((r) => String(r.id)).sort(),
        expected.rows.map((r) => r.id).sort(),
      );
    }
    await call(
      winner,
      "PATCH",
      `/api/reservaciones/${reservation.id}/cancelar`,
      {},
      200,
    );
    assert.equal(
      (await availability()).horarios.find(
        (h) => String(h.id) === String(first.id),
      ).disponible,
      true,
    );
    const next = (
      await call(winner, "POST", "/api/reservaciones", payload, 201)
    ).reservacion;
    await call(
      admin,
      "PATCH",
      `/api/admin/reservaciones/${next.id}/estado`,
      { estado: "CONFIRMADA" },
      200,
    );
    await call(
      admin,
      "PATCH",
      `/api/admin/reservaciones/${next.id}/estado`,
      { estado: "CONFIRMADA" },
      409,
    );
    await call(
      admin,
      "PATCH",
      `/api/admin/reservaciones/${next.id}/estado`,
      { estado: "FINALIZADA" },
      409,
    );
    await call(
      admin,
      "PATCH",
      `/api/admin/reservaciones/${next.id}/estado`,
      { estado: "CANCELADA" },
      200,
    );
    await call(
      admin,
      "PATCH",
      `/api/admin/reservaciones/${next.id}/estado`,
      { estado: "CONFIRMADA" },
      409,
    );
    const old = new Date(fechaHoyLocal() + "T12:00:00Z");
    old.setUTCDate(old.getUTCDate() - 1);
    const yesterday = old.toISOString().slice(0, 10);
    await call(
      client,
      "POST",
      "/api/reservaciones",
      { ...payload, fecha: yesterday },
      400,
    );
    const pastSlot = (
      await call(
        admin,
        "POST",
        "/api/horarios",
        {
          cancha_id: courtId,
          dia_semana: diaSemanaISO(yesterday),
          hora_inicio: "08:00",
          hora_fin: "09:00",
        },
        201,
      )
    ).horario;
    const past = (
      await pool.query(
        `INSERT INTO reservaciones(cliente_id,cancha_id,horario_id,fecha,hora_inicio,hora_fin,estado) VALUES($1,$2,$3,$4,'08:00','09:00','CONFIRMADA') RETURNING id`,
        [userId, courtId, pastSlot.id, yesterday],
      )
    ).rows[0];
    await call(
      admin,
      "PATCH",
      `/api/admin/reservaciones/${past.id}/estado`,
      { estado: "FINALIZADA" },
      200,
    );
    const summary = await call(
      admin,
      "GET",
      "/api/admin/resumen",
      undefined,
      200,
    );
    assert.ok(summary.total >= 3);
    const actual = (
      await pool.query(
        `SELECT count(*)::int AS total,count(*) FILTER(WHERE fecha=$1::date)::int AS hoy,
      count(*) FILTER(WHERE estado='CONFIRMADA')::int AS confirmadas,
      count(*) FILTER(WHERE estado='CANCELADA')::int AS canceladas,
      count(*) FILTER(WHERE estado='PENDIENTE')::int AS pendientes,
      (SELECT count(*)::int FROM canchas WHERE activa=TRUE) AS canchas_activas FROM reservaciones`,
        [fechaHoyLocal()],
      )
    ).rows[0];
    assert.deepEqual(summary, actual);
    pass(
      "PM-05/06/07/08/11/12/13",
      "Reserva concurrente sin duplicados, propiedad, cancelación/liberación, filtros, resumen y estados válidos e inválidos.",
    );
    for (const width of [768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      for (const [view, selector] of [
        ["canchas-admin", "#form-cancha"],
        ["horarios-admin", "#form-horario"],
        ["reservas-admin", "#form-filtros"],
      ]) {
        await page.locator(".admin-menu summary").click();
        await page.locator(`.admin-menu [data-view="${view}"]`).click();
        await page.locator(selector).waitFor();
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
          `${view} a ${width}px`,
        );
      }
    }
    await page.screenshot({
      path: path.join(output, "administracion_movil_verificada.png"),
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    pass(
      "UI-MOVIL",
      "Administración a 320, 390 y 768 píxeles sin desbordamiento horizontal.",
    );
    fs.writeFileSync(
      path.join(output, "administracion_resultados.json"),
      JSON.stringify({ fechaLocal: fechaHoyLocal(), casos: cases }, null, 2),
    );
  } finally {
    if (courtId) {
      await pool.query("DELETE FROM reservaciones WHERE cancha_id=$1", [
        courtId,
      ]);
      await pool.query("DELETE FROM horarios WHERE cancha_id=$1", [courtId]);
      await pool.query("DELETE FROM canchas WHERE id=$1", [courtId]);
    }
    if (userId) await pool.query("DELETE FROM usuarios WHERE id=$1", [userId]);
    await Promise.all([
      admin.close(),
      client.close(),
      other.close(),
      guest.close(),
    ]);
    await browser.close();
    await pool.end();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
