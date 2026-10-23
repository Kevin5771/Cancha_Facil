const fs = require("node:fs/promises");
const path = require("node:path");
const assets = path.resolve(__dirname, "../public/assets");
async function main() {
  await fs.mkdir(path.join(assets, "icons"), { recursive: true });
  await fs.mkdir(path.join(assets, "fonts"), { recursive: true });
  const photos = {
    "hero-tennis.jpg": "photo-1622279457486-62dcc4a431d6",
    "football.jpg": "photo-1522778119026-d647f0596c20",
    "basketball.jpg": "photo-1546519638-68e109498ffc",
    "volleyball.jpg": "photo-1592656094267-764a45160876",
    "tennis.jpg": "photo-1554068865-24cecd4e34b8",
  };
  await Promise.all(
    Object.entries(photos).map(async ([name, id]) => {
      const url = `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${name.startsWith("hero") ? 1920 : 850}&q=85`;
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (
        !response.ok ||
        !response.headers.get("content-type")?.startsWith("image/")
      )
        throw new Error(`Imagen no disponible: ${name}`);
      await fs.writeFile(
        path.join(assets, name),
        Buffer.from(await response.arrayBuffer()),
      );
      console.log(`Fotografía preparada: ${name}`);
    }),
  );
  for (const name of [
    "arrow-up-right",
    "arrow-right",
    "arrow-left",
    "search",
    "map-pin",
    "calendar-days",
    "clock-3",
    "check",
    "sliders-horizontal",
    "sun",
    "cloud",
    "cloud-rain",
    "wind",
    "layout-grid",
    "circle-user-round",
    "log-out",
    "menu",
    "x",
    "chevron-down",
    "goal",
    "circle-dot",
    "move-up-right",
    "shield-check",
    "moon",
    "star",
    "send",
    "messages-square",
    "refresh-cw",
    "heart-handshake",
  ]) {
    await fs.copyFile(
      path.resolve(
        __dirname,
        `../node_modules/lucide-static/icons/${name}.svg`,
      ),
      path.join(assets, "icons", `${name}.svg`),
    );
  }
  const fonts = path.resolve(
    __dirname,
    "../node_modules/@fontsource/dm-sans/files",
  );
  for (const weight of [400, 500, 600, 700]) {
    const name = `dm-sans-latin-${weight}-normal.woff2`;
    await fs.copyFile(path.join(fonts, name), path.join(assets, "fonts", name));
  }
  await fs.copyFile(
    path.resolve(__dirname, "../node_modules/@fontsource/dm-sans/LICENSE"),
    path.join(assets, "fonts/LICENSE.txt"),
  );
  await fs.copyFile(
    path.resolve(__dirname, "../node_modules/lucide-static/LICENSE"),
    path.join(assets, "icons/LICENSE.txt"),
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
