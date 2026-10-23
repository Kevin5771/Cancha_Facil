require("dotenv").config();
const { pool } = require("../src/infrastructure/database/postgres");
(async () => {
  for (const [nombre, tipo, descripcion, tarifa] of [
    [
      "Cancha Central",
      "Fútbol 5",
      "Cancha sintética para partidos amistosos",
      125,
    ],
    ["Cancha Norte", "Básquetbol", "Área techada", 75],
  ]) {
    const r = await pool.query(
      `INSERT INTO canchas(nombre,tipo,descripcion,tarifa_referencia) VALUES($1,$2,$3,$4)
       ON CONFLICT(nombre) DO UPDATE SET descripcion=EXCLUDED.descripcion RETURNING id`,
      [nombre, tipo, descripcion, tarifa],
    );
    for (let dia = 0; dia < 7; dia++)
      for (let hora = 8; hora < 21; hora++) {
        const a = String(hora).padStart(2, "0") + ":00",
          b = String(hora + 1).padStart(2, "0") + ":00";
        await pool.query(
          `INSERT INTO horarios(cancha_id,dia_semana,hora_inicio,hora_fin) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
          [r.rows[0].id, dia, a, b],
        );
      }
  }
  console.log("Canchas y horarios de demostración cargados.");
})()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
