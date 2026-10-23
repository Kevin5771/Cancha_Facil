require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");
const { Client } = require("pg");
const root = path.resolve(__dirname, "..");
const tables = [
  "usuarios",
  "canchas",
  "horarios",
  "reservaciones",
  "calificaciones_cancha",
  "comentarios_cancha",
];
function binary(name) {
  if (process.env.PG_BIN)
    return path.join(
      process.env.PG_BIN,
      process.platform === "win32" ? `${name}.exe` : name,
    );
  if (process.platform !== "win32") return name;
  const parent = "C:/Program Files/PostgreSQL";
  const versions = fs
    .readdirSync(parent)
    .filter((version) => /^\d+$/.test(version))
    .sort((a, b) => Number(b) - Number(a));
  const found = versions
    .map((version) => path.join(parent, version, "bin", `${name}.exe`))
    .find((candidate) => fs.existsSync(candidate));
  if (!found)
    throw new Error(
      `No se encontró ${name}. Configura PG_BIN con la carpeta bin de PostgreSQL.`,
    );
  return found;
}
function run(name, args, url) {
  const result = spawnSync(binary(name), args, {
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      PGHOST: url.hostname,
      PGPORT: url.port || "5432",
      PGUSER: decodeURIComponent(url.username),
      PGPASSWORD: decodeURIComponent(url.password),
      PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
      PGCONNECT_TIMEOUT: "10",
    },
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(result.stderr.trim() || `Falló ${name}.`);
  return result.stdout;
}
async function withClient(url, task) {
  const client = new Client({ connectionString: url.toString() });
  try {
    await client.connect();
    return await task(client);
  } finally {
    await client.end();
  }
}
async function counts(url) {
  return withClient(url, async (client) => {
    const result = {};
    for (const table of tables)
      result[table] = (
        await client.query(`SELECT count(*)::int AS total FROM ${table}`)
      ).rows[0].total;
    return result;
  });
}
const quote = (name) => '"' + name.replaceAll('"', '""') + '"';
async function main() {
  if (!process.env.DATABASE_URL)
    throw new Error("Configura DATABASE_URL en .env.");
  const source = new URL(process.env.DATABASE_URL);
  const command = process.argv[2];
  if (!["backup", "restore", "verify"].includes(command))
    throw new Error("Operación esperada: backup, restore o verify.");
  let file;
  if (command === "restore") {
    if (!process.argv[3])
      throw new Error(
        "Indica el archivo .dump: npm run db:restaurar -- ruta/al/respaldo.dump",
      );
    file = path.resolve(process.argv[3]);
    if (!fs.existsSync(file))
      throw new Error("El archivo de respaldo no existe.");
  } else {
    const directory = path.join(root, ".local/backups");
    fs.mkdirSync(directory, { recursive: true });
    file = path.join(
      directory,
      `canchafacil-${Date.now()}-${crypto.randomBytes(3).toString("hex")}.dump`,
    );
    run("pg_dump", ["--format=custom", "--no-owner", "--file", file], source);
    console.log(`Respaldo creado: ${file}`);
    if (command === "backup") return;
  }
  run("pg_restore", ["--list", file], source);
  const maintenance = new URL(source);
  maintenance.pathname = "/postgres";
  const targetName = `canchafacil_${command === "verify" ? "verificacion" : "restaurada"}_${crypto.randomBytes(6).toString("hex")}`;
  const target = new URL(source);
  target.pathname = "/" + targetName;
  await withClient(maintenance, (client) =>
    client.query(`CREATE DATABASE ${quote(targetName)}`),
  );
  let completed = false;
  try {
    run(
      "pg_restore",
      [
        "--exit-on-error",
        "--no-owner",
        "--no-privileges",
        "--dbname",
        targetName,
        file,
      ],
      source,
    );
    const restored = await counts(target);
    console.log(`Copia restaurada y consultable: ${targetName}`);
    console.log("Registros restaurados:", JSON.stringify(restored));
    if (command === "verify") {
      const original = await counts(source);
      if (JSON.stringify(original) !== JSON.stringify(restored))
        throw new Error(
          "Los conteos cambiaron durante el respaldo o difieren de la copia. La base original permanece intacta.",
        );
      console.log(
        "Verificación aprobada: las seis tablas coinciden con la base original.",
      );
    }
    completed = true;
  } finally {
    if (command === "verify") {
      // Solo se elimina la base temporal creada por esta ejecución, nunca la original.
      await withClient(maintenance, (client) =>
        client.query(`DROP DATABASE ${quote(targetName)}`),
      );
    } else if (!completed)
      console.error(
        `La copia incompleta quedó en ${targetName} para revisión; la base original no cambió.`,
      );
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
module.exports = { binary };
