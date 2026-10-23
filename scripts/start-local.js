require("dotenv").config();
const path = require("node:path");
const { spawnSync } = require("node:child_process");
async function main() {
  const { serverPort, startServer } = require("../src/server");
  const port = serverPort();
  if (!process.env.DATABASE_URL)
    throw new Error("Configura DATABASE_URL en .env antes de iniciar.");
  const database = new URL(process.env.DATABASE_URL);
  if (process.platform === "win32" &&
      ["127.0.0.1", "localhost"].includes(database.hostname) && database.port === "5433") {
  const result = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      path.join(__dirname, "start-local-db.ps1"),
    ],
    { stdio: "inherit", windowsHide: true },
  );
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error("No fue posible encender la base local.");
  }
  try {
    const response = await fetch(`http://localhost:${port}/api/health`, {
      signal: AbortSignal.timeout(2000),
    });
    const data = await response.json().catch(() => null);
    if (response.ok && data?.app === "CanchaFácil") {
      const catalog = await fetch(`http://localhost:${port}/api/canchas`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!catalog.ok)
        throw new Error(
          "La aplicación está encendida pero su catálogo no responde.",
        );
      console.log(
        `CanchaFácil ya está funcionando en http://localhost:${port}`,
      );
      return;
    }
    throw new Error(`El puerto ${port} está ocupado por otra aplicación.`);
  } catch (error) {
    if (error.cause?.code !== "ECONNREFUSED") throw error;
  }
  const { Client } = require("pg");
  const check = new Client({ connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000, query_timeout: 5000 });
  try {
    await check.connect();
    await check.query("SELECT 1 FROM usuarios LIMIT 1");
  } catch (error) {
    throw new Error(error.code === "42P01"
      ? "Faltan las tablas. Ejecuta npm run db:init antes de iniciar."
      : "No se pudo conectar a PostgreSQL. Revisa DATABASE_URL y que la base esté encendida.");
  } finally {
    await check.end();
  }
  await startServer();
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
