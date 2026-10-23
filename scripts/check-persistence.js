require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { pool } = require("../src/infrastructure/database/postgres");
const tables = [
  "usuarios",
  "canchas",
  "horarios",
  "reservaciones",
  "calificaciones_cancha",
  "comentarios_cancha",
];
async function main() {
  const output = path.resolve(__dirname, "../.local/walkthrough");
  fs.mkdirSync(output, { recursive: true });
  const state = {};
  for (const table of tables) {
    const result = await pool.query(`SELECT * FROM ${table} ORDER BY 1,2`);
    state[table] = {
      registros: result.rowCount,
      hash: crypto
        .createHash("sha256")
        .update(JSON.stringify(result.rows))
        .digest("hex"),
    };
  }
  const file = path.join(output, "persistencia_antes.json");
  if (process.argv[2] === "capture") {
    fs.writeFileSync(file, JSON.stringify(state, null, 2));
    console.log(
      "Huella de las seis tablas guardada para verificar el reinicio.",
    );
    return;
  }
  if (!fs.existsSync(file))
    throw new Error(
      "Ejecuta primero node scripts/check-persistence.js capture",
    );
  if (
    JSON.stringify(JSON.parse(fs.readFileSync(file, "utf8"))) !==
    JSON.stringify(state)
  )
    throw new Error("Los datos cambiaron entre las dos lecturas.");
  let response;
  for (let attempt = 0; attempt < 15; attempt++) {
    try {
      response = await fetch("http://localhost:3000/api/canchas", {
        signal: AbortSignal.timeout(3000),
      });
      if (response.ok) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!response?.ok)
    throw new Error("La aplicación no responde tras el reinicio.");
  fs.writeFileSync(
    path.join(output, "persistencia_resultado.json"),
    JSON.stringify(
      { resultado: "Aprobado", tablas: state, catalogoHTTP: response.status },
      null,
      2,
    ),
  );
  console.log(
    "Reinicio aprobado: catálogo HTTP 200 y contenido de las seis tablas intacto.",
  );
}
main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
