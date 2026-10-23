require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
const { pool } = require("../src/infrastructure/database/postgres");
async function main() {
  const root = path.resolve(__dirname, "..");
  const local = path.join(root, ".local");
  fs.mkdirSync(local, { recursive: true });
  const manifest = path.join(local, "usuarios-prueba.json");
  const users = fs.existsSync(manifest)
    ? JSON.parse(fs.readFileSync(manifest, "utf8"))
    : [
        ["Sofía Marroquín", "prueba01@example.com", "CLIENTE"],
        ["Mateo Solís", "prueba02@example.com", "CLIENTE"],
        ["Camila Estrada", "prueba03@example.com", "CLIENTE"],
        ["Andrés Fuentes", "prueba04@example.com", "CLIENTE"],
        ["Lucía Cabrera", "prueba05@example.com", "CLIENTE"],
        ["Sebastián Rivas", "prueba06@example.com", "CLIENTE"],
        ["Administrador de Pruebas", "prueba-admin@example.com", "ADMIN"],
      ].map(([nombre, correo, rol]) => ({
        nombre,
        correo,
        rol,
        password: `Cancha!${crypto.randomBytes(7).toString("hex")}`,
      }));
  fs.writeFileSync(manifest, JSON.stringify(users, null, 2));
  const hashes = await Promise.all(
    users.map((user) => bcrypt.hash(user.password, 12)),
  );
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    for (let index = 0; index < users.length; index++) {
      const user = users[index];
      const result = await db.query(
        `INSERT INTO usuarios(nombre,correo,password_hash,rol)
        VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING id`,
        [user.nombre, user.correo, hashes[index], user.rol],
      );
      if (!result.rowCount) {
        const existing = (
          await db.query(
            "SELECT password_hash,rol,activo FROM usuarios WHERE lower(correo)=lower($1)",
            [user.correo],
          )
        ).rows[0];
        if (
          !existing ||
          !existing.activo ||
          existing.rol !== user.rol ||
          !(await bcrypt.compare(user.password, existing.password_hash))
        ) {
          throw new Error(
            `La cuenta ${user.correo} ya existe con otros datos. Se conserva sin cambios.`,
          );
        }
      }
    }
    await db.query("COMMIT");
    const lines = [
      "CANCHAFÁCIL - USUARIOS FICTICIOS PARA PRUEBAS LOCALES",
      "Acceso: http://localhost:3000",
      "No son personas ni correos reales. Cada cuenta tiene su propia contraseña.",
      "La cuenta ADMIN tiene acceso administrativo completo, incluida la moderación del chat.",
      "",
      ...users.flatMap((user, index) => [
        `${index + 1}. ${user.nombre}`,
        `Rol: ${user.rol}`,
        `Correo: ${user.correo}`,
        `Contraseña: ${user.password}`,
        "",
      ]),
      "PRUEBA DEL CHAT",
      "1. Abre una ventana normal y otra de incógnito (o usa dos navegadores).",
      "2. Ingresa con prueba01 y prueba02, respectivamente.",
      "3. Entra en La grada y elige la misma cancha en ambas ventanas.",
      "4. Publica, responde y califica. Los mensajes se actualizan cada 15 segundos.",
      "5. Ctrl + Enter envía el mensaje; Enter permite escribir otra línea.",
      "6. Comprueba que solo puedas eliminar tus propios mensajes.",
      "7. Usa prueba-admin para comprobar la moderación.",
      "",
      "Si usas dos pestañas del mismo navegador, ambas comparten la sesión.",
      "Este archivo contiene credenciales y está excluido de Git.",
      "",
    ];
    fs.writeFileSync(
      path.join(root, "USUARIOS_PRUEBA.txt"),
      "\ufeff" + lines.join("\r\n"),
    );
    console.log(
      `${users.length} cuentas de prueba preparadas. Accesos en USUARIOS_PRUEBA.txt.`,
    );
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    db.release();
  }
}
main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
