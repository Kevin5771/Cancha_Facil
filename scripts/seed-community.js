require("dotenv").config();
const { pool } = require("../src/infrastructure/database/postgres");
async function main() {
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    await db.query("SELECT pg_advisory_xact_lock(20261020,43)");
    await db.query(`INSERT INTO canchas(nombre,tipo,descripcion,tarifa_referencia)
      VALUES('Cancha Luna','Fútbol 5','Grama sintética, iluminación nocturna y espacio para reunirte con tu equipo.',185)
      ON CONFLICT(nombre) DO NOTHING`);
    const ninth = (
      await db.query("SELECT id FROM canchas WHERE nombre='Cancha Luna'")
    ).rows[0];
    for (let day = 0; day < 7; day++)
      for (let hour = 7; hour < 22; hour++) {
        const start = `${String(hour).padStart(2, "0")}:00`;
        const end = `${String(hour + 1).padStart(2, "0")}:00`;
        await db.query(
          `INSERT INTO horarios(cancha_id,dia_semana,hora_inicio,hora_fin)
        SELECT $1,$2,$3::time,$4::time WHERE NOT EXISTS (SELECT 1 FROM horarios
          WHERE cancha_id=$1 AND dia_semana=$2 AND activo=TRUE AND hora_inicio<$4::time AND $3::time<hora_fin)
        ON CONFLICT DO NOTHING`,
          [ninth.id, day, start, end],
        );
      }
    const courts = (
      await db.query("SELECT id FROM canchas WHERE activa=TRUE ORDER BY id")
    ).rows;
    const users = (
      await db.query(
        "SELECT id FROM usuarios WHERE correo IN ('cliente01@example.com','cliente02@example.com','cliente03@example.com') ORDER BY correo",
      )
    ).rows;
    const texts = [
      "¿Quién se apunta a un partido el fin de semana? Podemos organizar equipo por aquí.",
      "Me gusta poder consultar los horarios antes de armar el plan. ¿Prefieren jugar por la mañana o por la tarde?",
      "Yo prefiero por la tarde. Si se completa el equipo, coordinamos una reserva.",
    ];
    for (const court of courts) {
      let parent = null;
      for (let i = 0; i < users.length; i++) {
        await db.query(
          `INSERT INTO calificaciones_cancha(cancha_id,usuario_id,puntuacion)
          VALUES($1,$2,$3) ON CONFLICT DO NOTHING`,
          [court.id, users[i].id, [4, 5, 4][i]],
        );
        const existing = await db.query(
          "SELECT id FROM comentarios_cancha WHERE cancha_id=$1 AND usuario_id=$2 AND contenido=$3",
          [court.id, users[i].id, texts[i]],
        );
        if (existing.rowCount) {
          if (i === 0) parent = existing.rows[0].id;
          continue;
        }
        const message = await db.query(
          `INSERT INTO comentarios_cancha(cancha_id,usuario_id,contenido,respuesta_a)
          VALUES($1,$2,$3,$4) RETURNING id`,
          [court.id, users[i].id, texts[i], i === 2 ? parent : null],
        );
        if (i === 0) parent = message.rows[0].id;
      }
    }
    await db.query("COMMIT");
    console.log(
      "Cancha Luna y comunidad de demostración preparadas. Nombres, opiniones y valoraciones son ficticios.",
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
