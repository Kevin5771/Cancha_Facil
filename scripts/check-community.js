require("dotenv").config();
const { chromium, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const output = path.resolve(__dirname, "../.local/walkthrough");
const base = "http://localhost:3000";
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const credentials = JSON.parse(
    fs.readFileSync(
      path.resolve(__dirname, "../.local/clientes-demo.json"),
      "utf8",
    ),
  );
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1080 },
    reducedMotion: "reduce",
    colorScheme: "light",
    recordVideo: { dir: output },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("dialog", (dialog) => dialog.accept());
  let messageId;
  let replyId;
  try {
    await page.goto(base);
    await expect(page.locator(".card")).toHaveCount(9);
    await page.getByRole("button", { name: "Activar modo oscuro" }).click();
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator(".card")).toHaveCount(9);
    await page.screenshot({
      path: path.join(output, "luna_oscuro.png"),
      fullPage: false,
    });
    const combo = page.getByRole("combobox", {
      name: "Tu deporte",
      exact: true,
    });
    await combo.click();
    await expect(combo).toHaveAttribute("aria-expanded", "true");
    await page.screenshot({ path: path.join(output, "selector_luna.png") });
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await expect(combo).toContainText("Tenis");
    await combo.click();
    await page.keyboard.press("Escape");
    await expect(combo).toHaveAttribute("aria-expanded", "false");
    await page.getByRole("button", { name: "Activar modo claro" }).click();
    await page.locator('.nav-links [data-view="comunidad"]').click();
    await expect(page.locator(".community-court")).toHaveCount(9);
    await page.screenshot({
      path: path.join(output, "la_grada_inicio.png"),
      fullPage: true,
    });
    await page
      .locator(".community-court")
      .filter({ hasText: "Cancha Luna" })
      .click();
    await expect(page.locator("#community-feed")).toBeVisible();
    await expect(page.locator(".chat-day").first()).toBeVisible();
    const older = page.locator('[data-action="comunidad-anteriores"]');
    if (await older.isVisible()) {
      const before = await page.locator(".community-message").count();
      await older.click();
      await expect
        .poll(() => page.locator(".community-message").count())
        .toBeGreaterThan(before);
    }
    const publicData = await (
      await page.request.get(base + "/api/canchas")
    ).json();
    const courtId = publicData.canchas.find(
      (c) => c.nombre === "Cancha Luna",
    ).id;
    const endpoint = base + `/api/comunidad/canchas/${courtId}`;
    const guestWrite = await page.request.post(endpoint + "/comentarios", {
      data: { contenido: "No se debe publicar sin sesión" },
    });
    assert.equal(guestWrite.status(), 401);
    await page
      .getByRole("button", { name: "Únete a la conversación", exact: true })
      .click();
    await page.locator("#login-correo").fill(credentials.clientes[0].correo);
    await page.locator("#login-clave").fill(credentials.password);
    await page.locator("#form-login button[type=submit]").click();
    await expect(page.locator("#form-comentario")).toBeVisible();
    const previous = (
      await (await page.request.get(endpoint + "/calificacion")).json()
    ).puntuacion;
    const initial = (await (await page.request.get(endpoint)).json()).resumen;
    await page.locator(".rating-stars label").nth(4).click();
    const ratingResponse = page.waitForResponse(
      (r) =>
        r.url() === endpoint + "/calificacion" &&
        r.request().method() === "PUT",
    );
    await page.locator("#form-calificacion button[type=submit]").click();
    assert.equal((await ratingResponse).status(), 200);
    await expect(page.locator(".rating-hint").first()).toContainText(
      "Calificación guardada",
    );
    const updated = (await (await page.request.get(endpoint)).json()).resumen;
    assert.equal(updated.votos, initial.votos);
    const observer = await context.newPage();
    await observer.goto(base);
    await observer.locator('.nav-links [data-view="comunidad"]').click();
    await observer
      .locator(".community-court")
      .filter({ hasText: "Cancha Luna" })
      .click();
    await observer.locator("#community-feed").waitFor();
    const text = `¿Partido el sábado? Verificación ${Date.now()} <img src=x onerror=alert(1)>`;
    await page.locator("#mensaje-comunidad").fill(text);
    const postResponse = page.waitForResponse(
      (r) =>
        r.url() === endpoint + "/comentarios" &&
        r.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Publicar", exact: true }).click();
    const post = await postResponse;
    assert.equal(post.status(), 201);
    messageId = (await post.json()).comentario.id;
    const message = page.locator(`[data-message-id="${messageId}"]`);
    await expect(message).toContainText(text);
    assert.equal(await message.locator(".message-body > p img").count(), 0);
    await expect(
      observer.locator(`[data-message-id="${messageId}"]`),
    ).toContainText(text, { timeout: 22000 });
    await message
      .getByRole("button", { name: "Responder", exact: true })
      .click();
    await page.locator("#mensaje-comunidad").fill("Me apunto al equipo.");
    const replyResponse = page.waitForResponse(
      (r) =>
        r.url() === endpoint + "/comentarios" &&
        r.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Publicar", exact: true }).click();
    replyId = (await (await replyResponse).json()).comentario.id;
    await expect(
      page.locator(`[data-message-id="${replyId}"] blockquote`),
    ).toBeVisible();
    await page.getByRole("button", { name: "Activar modo oscuro" }).click();
    await page.screenshot({
      path: path.join(output, "la_grada_oscuro.png"),
      fullPage: true,
    });
    await page.reload();
    await page.locator('.nav-links [data-view="comunidad"]').click();
    await page
      .locator(".community-court")
      .filter({ hasText: "Cancha Luna" })
      .click();
    await expect(
      page.locator(`[data-message-id="${messageId}"]`),
    ).toContainText(text);
    // Un segundo cliente no puede borrar los mensajes de otra cuenta.
    const other = await browser.newContext();
    await other.request.post(base + "/api/auth/login", {
      data: {
        correo: credentials.clientes[1].correo,
        password: credentials.password,
      },
    });
    const unauthorized = await other.request.delete(
      base + `/api/comunidad/comentarios/${messageId}`,
    );
    assert.equal(unauthorized.status(), 404);
    await other.close();
    for (const id of [messageId, replyId]) {
      const result = await page.request.delete(
        base + `/api/comunidad/comentarios/${id}`,
      );
      assert.equal(result.status(), 200);
      if (id === messageId) {
        await page
          .getByRole("button", { name: "Actualizar conversación", exact: true })
          .click();
        await expect(
          page.locator(`[data-message-id="${replyId}"] blockquote`),
        ).toContainText("Comentario eliminado");
      }
    }
    if (previous)
      await page.request.put(endpoint + "/calificacion", {
        data: { puntuacion: previous },
      });
    await observer.close();
    const mobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
      colorScheme: "dark",
      isMobile: true,
    });
    const phone = await mobile.newPage();
    await phone.goto(base);
    await expect(phone.locator(".card")).toHaveCount(9);
    await phone.locator('.nav-links [data-view="comunidad"]').click();
    await phone
      .locator(".community-court")
      .filter({ hasText: "Cancha Luna" })
      .click();
    await expect(phone.locator("#community-feed")).toBeVisible();
    assert.equal(
      await phone.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await phone.screenshot({
      path: path.join(output, "la_grada_movil.png"),
      fullPage: true,
    });
    await mobile.close();
    assert.deepEqual(errors, []);
    console.log(
      "Luna y comunidad aprobados: 9 canchas, tema persistente, selectores con teclado, voto único, mensajes y respuestas persistentes, actualización entre pestañas, texto seguro, permisos y móvil.",
    );
  } finally {
    await context.close();
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
