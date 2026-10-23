require("dotenv").config();
const { chromium } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const fs = require("node:fs");
const path = require("node:path");
async function main() {
  const browser = await chromium.launch();
  const output = path.resolve(__dirname, "../.local/walkthrough");
  fs.mkdirSync(output, { recursive: true });
  const results = [];
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    for (const theme of ["light", "dark"]) {
      await page.goto("http://localhost:3000");
      await page.evaluate(
        (theme) => localStorage.setItem("cf-tema", theme),
        theme,
      );
      await page.reload();
      await page.locator(".card").first().waitFor();
      if ((await page.locator("html").getAttribute("data-theme")) !== theme)
        throw new Error("El tema de la revisión no coincide.");
      for (const [name, selector] of [
        ["catalogo", ".card"],
        ["login", "#form-login"],
        ["registro", "#form-registro"],
        ["comunidad", ".community-court"],
      ]) {
        if (name === "login")
          await page.locator('.header [data-view="login"]').click();
        if (name === "registro")
          await page.locator('#app [data-view="registro"]').click();
        if (name === "comunidad")
          await page.locator('.nav-links [data-view="comunidad"]').click();
        await page.locator(selector).first().waitFor();
        await page.evaluate(() => document.fonts.ready);
        const result = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        results.push({
          vista: name,
          tema: theme,
          ancho: 390,
          violaciones: result.violations,
        });
        console.log(`${name}/${theme}: ${result.violations.length} hallazgos`);
      }
    }
    await context.request.post("http://localhost:3000/api/auth/login", {
      data: {
        correo: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
      },
    });
    await page.goto("http://localhost:3000");
    await page.locator(".card").first().waitFor();
    for (const width of [1440, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const [view, selector] of [
        ["canchas-admin", "#form-cancha"],
        ["horarios-admin", "#form-horario"],
        ["reservas-admin", "#form-filtros"],
      ]) {
        await page.locator(".admin-menu summary").click();
        await page.locator(`.admin-menu [data-view="${view}"]`).click();
        await page.locator(selector).waitFor();
        const result = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        results.push({
          vista: view,
          tema: "dark",
          ancho: width,
          violaciones: result.violations,
        });
        console.log(`${view}/${width}: ${result.violations.length} hallazgos`);
      }
    }
    fs.writeFileSync(
      path.join(output, "accesibilidad_resultados.json"),
      JSON.stringify(results, null, 2),
    );
    const failed = results.filter((result) => result.violaciones.length);
    if (failed.length) {
      console.log(
        JSON.stringify(
          failed.map((result) => ({
            vista: result.vista,
            tema: result.tema,
            ancho: result.ancho,
            fallos: result.violaciones.map((v) => ({
              id: v.id,
              nodos: v.nodes
                .slice(0, 5)
                .map((n) => ({
                  selector: n.target,
                  resumen: n.failureSummary,
                })),
            })),
          })),
          null,
          2,
        ),
      );
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
