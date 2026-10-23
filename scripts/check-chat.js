require("dotenv").config();
const { chromium, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
async function main() {
  const root = path.resolve(__dirname, "..");
  const users = JSON.parse(
    fs.readFileSync(path.join(root, ".local/usuarios-prueba.json"), "utf8"),
  );
  const txt = fs.readFileSync(path.join(root, "USUARIOS_PRUEBA.txt"), "utf8");
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1080 },
    colorScheme: "dark",
    reducedMotion: "reduce",
  });
  const context2 = await browser.newContext();
  const created = [];
  try {
    for (const user of users) {
      assert.equal(
        txt.includes(user.correo) && txt.includes(user.password),
        true,
      );
      const response = await context.request.post(
        "http://localhost:3000/api/auth/login",
        { data: { correo: user.correo, password: user.password } },
      );
      assert.equal(response.status(), 200, `Login fallido para ${user.correo}`);
      assert.equal((await response.json()).usuario.rol, user.rol);
    }
    await context.request.post("http://localhost:3000/api/auth/login", {
      data: { correo: users[0].correo, password: users[0].password },
    });
    await context2.request.post("http://localhost:3000/api/auth/login", {
      data: { correo: users[1].correo, password: users[1].password },
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    async function openCourt(name) {
      await page.locator('.nav-links [data-view="comunidad"]').click();
      await page.locator(".community-court").filter({ hasText: name }).click();
      await page.locator("#form-comentario").waitFor();
    }
    await page.goto("http://localhost:3000");
    await openCourt("Cancha Luna");
    const input = page.locator("#mensaje-comunidad");
    await input.fill("¿Armamos equipo el sábado? Este es mi borrador.");
    await openCourt("Cancha Central");
    assert.equal(await input.inputValue(), "");
    await openCourt("Cancha Luna");
    assert.equal(
      await input.inputValue(),
      "¿Armamos equipo el sábado? Este es mi borrador.",
    );
    await page.reload();
    await openCourt("Cancha Luna");
    assert.equal(
      await input.inputValue(),
      "¿Armamos equipo el sábado? Este es mi borrador.",
    );
    const courts = (
      await (
        await context.request.get("http://localhost:3000/api/canchas")
      ).json()
    ).canchas;
    const id = courts.find((c) => c.nombre === "Cancha Luna").id;
    const endpoint = `http://localhost:3000/api/comunidad/canchas/${id}/comentarios`;
    const feed = page.locator("#community-feed");
    // Si la base es nueva, crear suficientes mensajes para probar una conversación desplazable.
    let counter = 0;
    while (
      (await feed.evaluate((el) => el.scrollHeight <= el.clientHeight + 20)) &&
      counter < 6
    ) {
      const response = await context2.request.post(endpoint, {
        data: {
          contenido: `Mensaje de verificación de lectura ${++counter}. ¿A qué hora se reúne el equipo para jugar?`,
        },
      });
      assert.equal(response.status(), 201);
      created.push((await response.json()).comentario.id);
      await page
        .getByRole("button", { name: "Actualizar conversación" })
        .click();
    }
    await feed.evaluate((el) => {
      el.scrollTop = 0;
    });
    const incoming = await context2.request.post(endpoint, {
      data: {
        contenido: `Aviso de prueba ${Date.now()}: hay espacio en el equipo.`,
      },
    });
    created.push((await incoming.json()).comentario.id);
    await page.getByRole("button", { name: "Actualizar conversación" }).click();
    await expect(page.locator("#chat-new-messages")).toBeVisible();
    assert.equal(await feed.evaluate((el) => el.scrollTop < 2), true);
    await page.locator("#chat-new-messages").click();
    await expect(page.locator("#chat-new-messages")).toBeHidden();
    assert.equal(
      await feed.evaluate(
        (el) => el.scrollHeight - el.scrollTop - el.clientHeight < 35,
      ),
      true,
    );
    await page.locator("#chat-search").fill("no-coincide-con-ningun-mensaje");
    await expect(feed).toContainText("Sin coincidencias.");
    await page.locator("#chat-search").fill("hay espacio en el equipo");
    assert.equal(await feed.locator(".community-message").count(), 1);
    await page.locator("#chat-search").fill("");
    await page.route(endpoint, (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Prueba de conexión temporal" }),
      }),
    );
    await input.press("Control+Enter");
    await expect(page.locator("#alerta")).toContainText(
      "Prueba de conexión temporal",
    );
    assert.equal(
      await input.inputValue(),
      "¿Armamos equipo el sábado? Este es mi borrador.",
    );
    await page.unroute(endpoint);
    const posted = page.waitForResponse(
      (response) =>
        response.url() === endpoint && response.request().method() === "POST",
    );
    await input.press("Control+Enter");
    const response = await posted;
    assert.equal(response.status(), 201);
    created.push((await response.json()).comentario.id);
    await expect(input).toHaveValue("");
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: path.join(root, ".local/walkthrough/chat_mejorado.png"),
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    console.log(
      "Aprobado: siete accesos del TXT, borradores por cancha y recarga, búsqueda, posición de lectura, aviso de mensajes nuevos, recuperación ante error y envío con Ctrl+Enter.",
    );
  } finally {
    await context.request.post("http://localhost:3000/api/auth/login", {
      data: { correo: users.at(-1).correo, password: users.at(-1).password },
    });
    for (const id of created)
      await context.request.delete(
        `http://localhost:3000/api/comunidad/comentarios/${id}`,
      );
    await context.close();
    await context2.close();
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
