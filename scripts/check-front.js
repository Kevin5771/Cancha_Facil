// Verificación de navegador contra la app y la base local de demostración.
require("dotenv").config();
const { chromium } = require("@playwright/test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { fechaHoyLocal } = require("../src/shared/validation");
const output = path.resolve(__dirname, "../.local/walkthrough");
const base = "http://localhost:3000";
async function elegir(page, selector, value) {
  const select = page.locator(selector);
  const label = await select.locator(`option[value="${value}"]`).textContent();
  const widget = select.locator("..");
  await widget.locator(".select-trigger").click();
  await widget.getByRole("option", { name: label, exact: true }).click();
}

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const demo = JSON.parse(
    fs.readFileSync(
      path.resolve(__dirname, "../.local/clientes-demo.json"),
      "utf8",
    ),
  );
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1080 },
    reducedMotion: "reduce",
    recordVideo: { dir: output, size: { width: 1440, height: 1080 } },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("dialog", (dialog) => dialog.accept());
  try {
    await page.goto(base);
    await page.locator(".card").first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.locator(".court-photo").last().scrollIntoViewIfNeeded();
    await page.waitForFunction(() =>
      [...document.images].every((img) => img.complete),
    );
    assert.equal(await page.locator(".card").count(), 9);
    assert.deepEqual(
      await page
        .locator("img")
        .evaluateAll((images) =>
          images.filter((img) => !img.naturalWidth).map((img) => img.src),
        ),
      [],
    );
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: path.join(output, "catalogo_escritorio.png"),
      fullPage: true,
    });
    await page.screenshot({
      path: path.join(output, "portada_escritorio.png"),
    });
    await page
      .getByRole("group", { name: "Filtrar por deporte" })
      .getByRole("button", { name: "Tenis", exact: true })
      .click();
    assert.equal(await page.locator(".card").count(), 1);
    await page.locator("#buscar-nombre").fill("no-existe-esta-cancha");
    await page
      .getByRole("heading", { name: "No encontramos esa cancha" })
      .waitFor();
    await page
      .getByRole("button", { name: "Ver todas las canchas", exact: true })
      .click();
    assert.equal(await page.locator(".card").count(), 9);
    await elegir(page, "#orden-canchas", "menor");
    const amounts = await page.locator(".court-price strong").allTextContents();
    const numbers = amounts.map((text) => Number(text.replace(/[^\d.]/g, "")));
    assert.deepEqual(
      numbers,
      [...numbers].sort((a, b) => a - b),
    );
    const tomorrow = new Date(fechaHoyLocal() + "T12:00:00Z");
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const date = tomorrow.toISOString().slice(0, 10);
    await elegir(page, "#buscar-deporte", "Tenis");
    await page.locator("#buscar-fecha").fill(date);
    await page
      .getByRole("button", { name: "Buscar cancha", exact: true })
      .click();
    assert.equal(await page.locator(".card").count(), 1);
    await page.locator(".card-book").click();
    await page.locator("#fecha-reserva").waitFor();
    assert.equal(await page.locator("#fecha-reserva").inputValue(), date);
    await page
      .locator('[data-action="reservar"]:not(:disabled)')
      .first()
      .click();
    await page.locator("#form-login").waitFor();
    await page.screenshot({
      path: path.join(output, "acceso_escritorio.png"),
      fullPage: true,
    });
    await page.locator("#login-correo").fill(demo.clientes[0].correo);
    await page.locator("#login-clave").fill(demo.password);
    await page.locator("#form-login button[type=submit]").click();
    await page.locator("#fecha-reserva").waitFor();
    const createResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/reservaciones") &&
        response.request().method() === "POST",
    );
    await page
      .locator('[data-action="reservar"]:not(:disabled)')
      .first()
      .click();
    const response = await createResponse;
    assert.equal(response.status(), 201);
    const { reservacion } = await response.json();
    const cancel = page.locator(
      `[data-action="cancelar"][data-id="${reservacion.id}"]`,
    );
    await cancel.waitFor();
    await cancel.click();
    await page.waitForFunction(
      (id) =>
        !document.querySelector(`[data-action="cancelar"][data-id="${id}"]`),
      reservacion.id,
    );
    await page.locator('[data-action="salir"]').click();
    await page.locator(".hero").waitFor();
    await page.locator('[data-view="login"]').click();
    await page.locator("#login-correo").fill(process.env.ADMIN_EMAIL);
    await page.locator("#login-clave").fill(process.env.ADMIN_PASSWORD);
    await page.locator("#form-login button[type=submit]").click();
    await page.locator(".stats").waitFor();
    await page.screenshot({
      path: path.join(output, "panel_escritorio.png"),
      fullPage: true,
    });
    for (const [view, expected] of [
      ["canchas-admin", "#form-cancha"],
      ["horarios-admin", "#form-horario"],
      ["reservas-admin", "#form-filtros"],
    ]) {
      await page.locator(".admin-menu summary").click();
      await page.locator(`.admin-menu [data-view="${view}"]`).click();
      await page.locator(expected).waitFor();
    }
    assert.deepEqual(errors, []);
    const mobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });
    await mobile.route("https://api.open-meteo.com/**", (route) =>
      route.abort(),
    );
    const mobilePage = await mobile.newPage();
    await mobilePage.goto(base);
    await mobilePage.locator(".card").first().waitFor();
    assert.match(
      await mobilePage.locator("#weather").textContent(),
      /Ciudad de Guatemala/,
    );
    await mobilePage.evaluate(() => document.fonts.ready);
    await mobilePage.locator(".court-photo").last().scrollIntoViewIfNeeded();
    await mobilePage.waitForFunction(() =>
      [...document.images].every((img) => img.complete),
    );
    assert.equal(
      await mobilePage.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await mobilePage.evaluate(() => scrollTo(0, 0));
    await mobilePage.screenshot({
      path: path.join(output, "catalogo_movil.png"),
      fullPage: true,
    });
    await mobilePage.screenshot({
      path: path.join(output, "portada_movil.png"),
    });
    assert.equal(
      await mobilePage
        .locator(".hero h1")
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
      true,
    );
    await mobilePage
      .getByRole("group", { name: "Filtrar por deporte" })
      .getByRole("button", { name: "Tenis", exact: true })
      .click();
    assert.equal(await mobilePage.locator(".card").count(), 1);
    await mobilePage.locator(".card-book").click();
    await mobilePage.locator(".slots").waitFor();
    assert.equal(
      await mobilePage.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await mobilePage.setViewportSize({ width: 320, height: 740 });
    await mobilePage
      .getByRole("button", { name: "CanchaFácil, ir al inicio", exact: true })
      .click();
    await mobilePage.locator(".hero").waitFor();
    assert.equal(
      await mobilePage
        .locator(".hero h1")
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
      true,
    );
    assert.equal(
      await mobilePage.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await mobile.close();
    console.log(
      "Verificación aprobada: imágenes, filtros, orden, fecha, login, reserva, cancelación, administración y móvil sin desbordamiento.",
    );
    console.log("Capturas y grabación del recorrido en .local/walkthrough.");
  } catch (error) {
    console.log(
      "Estado de revisión:",
      await page.evaluate(() => ({
        title: document.title,
        url: location.pathname,
        filtro: typeof filtrosCatalogo === "undefined" ? null : filtrosCatalogo,
        mensaje: document.querySelector(".empty")?.textContent,
      })),
    );
    await page.screenshot({
      path: path.join(output, "revision_error.png"),
      fullPage: true,
    });
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
