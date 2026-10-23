// Capturas limpias del resultado implementado; no publica mensajes.
require("dotenv").config();
const { chromium } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
async function main() {
  const output = path.resolve(__dirname, "../.local/walkthrough");
  fs.mkdirSync(output, { recursive: true });
  const demo = JSON.parse(
    fs.readFileSync(
      path.resolve(__dirname, "../.local/clientes-demo.json"),
      "utf8",
    ),
  );
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1080 },
      colorScheme: "dark",
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await context.request.post("http://localhost:3000/api/auth/login", {
      data: { correo: demo.clientes[0].correo, password: demo.password },
    });
    await page.goto("http://localhost:3000");
    await page.locator(".card").first().waitFor();
    await page.locator('.nav-links [data-view="comunidad"]').click();
    await page
      .locator(".community-court")
      .filter({ hasText: "Cancha Los Pinos" })
      .click();
    await page.locator("#form-comentario").waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.locator("#community-feed").evaluate((el) => {
      el.scrollTop = 0;
    });
    await page.screenshot({
      path: path.join(output, "la_grada_final.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Activar modo claro" }).click();
    await page.screenshot({
      path: path.join(output, "la_grada_claro.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Activar modo oscuro" }).click();
    await page.screenshot({
      path: path.join(output, "la_grada_movil_final.png"),
      fullPage: true,
    });
    await context.close();
    console.log("Capturas finales guardadas en .local/walkthrough.");
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
