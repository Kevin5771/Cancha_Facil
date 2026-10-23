require("dotenv").config();
const bcrypt = require("bcryptjs");
const { pool } = require("../src/infrastructure/database/postgres");
(async () => {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NOMBRE } = process.env;
  if (
    !ADMIN_EMAIL ||
    !ADMIN_PASSWORD ||
    ADMIN_PASSWORD.length < 10 ||
    ADMIN_PASSWORD.includes("CAMBIA")
  )
    throw new Error(
      "Configura ADMIN_EMAIL y ADMIN_PASSWORD (mínimo 10 caracteres) en .env",
    );
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await pool.query(
    `INSERT INTO usuarios(nombre,correo,password_hash,rol) VALUES($1,$2,$3,'ADMIN')
  ON CONFLICT DO NOTHING`,
    [ADMIN_NOMBRE || "Administrador", ADMIN_EMAIL.toLowerCase(), hash],
  );
  console.log("Administrador creado si el correo no existía.");
})()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
