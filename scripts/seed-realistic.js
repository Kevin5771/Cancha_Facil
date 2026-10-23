// Datos ficticios para demostraciones en Guatemala; no representan negocios ni personas reales.
require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const { pool } = require('../src/infrastructure/database/postgres');
const { fechaHoyLocal, horaHoyLocal, diaSemanaISO } = require('../src/shared/validation');

const courts = [
  ['Cancha Los Pinos', 'Fútbol 5', 'Grama sintética, iluminación para partidos nocturnos y parqueo.', 175],
  ['Cancha Las Jacarandas', 'Fútbol 7', 'Campo de grama sintética con graderío y vestidores.', 275],
  ['Cancha El Encinal', 'Básquetbol', 'Cancha techada con piso deportivo y marcadores manuales.', 100],
  ['Cancha La Ceiba', 'Voleibol', 'Área techada con red reglamentaria y espacio para espectadores.', 85],
  ['Cancha Vista Verde', 'Tenis', 'Superficie dura, iluminación y bancas para jugadores.', 130],
  ['Cancha Los Volcanes', 'Fútbol 5', 'Grama sintética, malla perimetral y área de descanso.', 150],
];
const names = [
  'Diego Alejandro Morales', 'María Fernanda López', 'José Andrés Pérez',
  'Ana Lucía Hernández', 'Luis Fernando Méndez', 'Gabriela Sofía Castillo',
  'Carlos Eduardo Ramírez', 'Valeria Isabel García', 'Jorge Estuardo Vásquez',
  'Daniela Alejandra Reyes', 'Pablo Antonio Castañeda', 'Andrea Paola Aguilar',
];
const clock = hour => `${String(hour).padStart(2, '0')}:00`;
function dateOffset(date, days) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

async function main() {
  const local = path.resolve(__dirname, '../.local');
  fs.mkdirSync(local, { recursive: true });
  const credentialsPath = path.join(local, 'clientes-demo.json');
  const credentials = fs.existsSync(credentialsPath)
    ? JSON.parse(fs.readFileSync(credentialsPath, 'utf8'))
    : { aviso: 'Cuentas ficticias de prueba. No usar fuera del entorno local.',
        password: crypto.randomBytes(15).toString('base64url'), clientes: [] };
  // Guardar antes de escribir la base permite recuperar el acceso si se interrumpe el proceso.
  fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));
  const hash = await bcrypt.hash(credentials.password, 12);
  const db = await pool.connect();
  const added = { canchas: 0, clientes: 0, horarios: 0, reservaciones: 0 };
  try {
    await db.query('BEGIN');
    // Serializar dos ejecuciones de esta misma carga.
    await db.query('SELECT pg_advisory_xact_lock(20261020, 42)');
    const courtIds = [];
    for (const court of courts) {
      const result = await db.query(`INSERT INTO canchas(nombre,tipo,descripcion,tarifa_referencia)
        VALUES($1,$2,$3,$4) ON CONFLICT(nombre) DO NOTHING RETURNING id`, court);
      added.canchas += result.rowCount;
      const existing = result.rows[0] || (await db.query('SELECT id FROM canchas WHERE nombre=$1', [court[0]])).rows[0];
      courtIds.push(existing.id);
      for (let day = 0; day < 7; day++) {
        for (let hour = day === 0 || day === 6 ? 7 : 6; hour < 22; hour++) {
          const slot = await db.query(`INSERT INTO horarios(cancha_id,dia_semana,hora_inicio,hora_fin)
            SELECT $1,$2,$3::time,$4::time WHERE NOT EXISTS (
              SELECT 1 FROM horarios WHERE cancha_id=$1 AND dia_semana=$2 AND activo=TRUE
                AND hora_inicio < $4::time AND $3::time < hora_fin
            ) ON CONFLICT DO NOTHING`, [existing.id, day, clock(hour), clock(hour + 1)]);
          added.horarios += slot.rowCount;
        }
      }
    }
    const users = [];
    const accessibleUsers = [];
    for (let index = 0; index < names.length; index++) {
      const email = `cliente${String(index + 1).padStart(2, '0')}@example.com`;
      const result = await db.query(`INSERT INTO usuarios(nombre,correo,password_hash,telefono)
        VALUES($1,$2,$3,NULL) ON CONFLICT DO NOTHING RETURNING id`, [names[index], email, hash]);
      added.clientes += result.rowCount;
      const user = result.rows[0] || (await db.query('SELECT id,password_hash FROM usuarios WHERE lower(correo)=lower($1)', [email])).rows[0];
      users.push(user.id);
      // No cambiar contraseñas de cuentas preexistentes ni atribuirles una clave que no tienen.
      if (result.rowCount || await bcrypt.compare(credentials.password, user.password_hash)) {
        accessibleUsers.push({ nombre: names[index], correo: email });
      }
    }
    const today = fechaHoyLocal();
    const offsets = [-14, -10, -7, -3, -1, 1, 2, 3, 5, 7, 10, 14, 0];
    for (let courtIndex = 0; courtIndex < courtIds.length; courtIndex++) {
      for (let index = 0; index < offsets.length; index++) {
        const date = dateOffset(today, offsets[index]);
        const hour = [9, 11, 15, 18][(courtIndex + index) % 4];
        const user = users[(courtIndex * 3 + index) % users.length];
        const state = offsets[index] < 0 || (date === today && clock(hour + 1) <= horaHoyLocal())
          ? ((courtIndex + index) % 4 === 0 ? 'CANCELADA' : 'FINALIZADA')
          : ['PENDIENTE', 'CONFIRMADA', 'CONFIRMADA', 'CANCELADA'][(courtIndex + index) % 4];
        const result = await db.query(`INSERT INTO reservaciones
          (cliente_id,cancha_id,horario_id,fecha,hora_inicio,hora_fin,estado,creado_en,actualizado_en)
          SELECT $1,$2,h.id,$3::date,h.hora_inicio,h.hora_fin,$6,
            LEAST(($3::date - interval '3 days') AT TIME ZONE $7, now() - interval '2 days'),
            LEAST(($3::date - interval '2 days') AT TIME ZONE $7, now() - interval '1 day')
          FROM horarios h JOIN canchas c ON c.id=h.cancha_id
          WHERE h.cancha_id=$2 AND h.dia_semana=$4 AND h.hora_inicio=$5::time
            AND h.activo=TRUE AND c.activa=TRUE
            AND NOT EXISTS (SELECT 1 FROM reservaciones r
              WHERE r.cliente_id=$1 AND r.cancha_id=$2 AND r.fecha=$3::date
                AND r.hora_inicio=h.hora_inicio AND r.hora_fin=h.hora_fin)
            AND NOT EXISTS (SELECT 1 FROM reservaciones r
              WHERE r.cancha_id=$2 AND r.fecha=$3::date AND r.estado IN ('PENDIENTE','CONFIRMADA')
                AND r.hora_inicio<h.hora_fin AND h.hora_inicio<r.hora_fin)
          ON CONFLICT DO NOTHING`, [user, courtIds[courtIndex], date, diaSemanaISO(date), clock(hour), state,
          process.env.APP_TIMEZONE || 'America/Guatemala']);
        added.reservaciones += result.rowCount;
      }
    }
    await db.query(`UPDATE reservaciones SET
      creado_en=LEAST(creado_en,now() - interval '2 days'),
      actualizado_en=LEAST(actualizado_en,now() - interval '1 day')
      WHERE cliente_id=ANY($1::bigint[]) AND cancha_id=ANY($2::bigint[])
        AND (creado_en>now() OR actualizado_en>now())`, [users, courtIds]);
    await db.query('COMMIT');
    credentials.clientes = accessibleUsers;
    fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));
    console.log('Datos ficticios de Guatemala cargados. Tarifas de referencia en quetzales.');
    console.log('Registros agregados:', JSON.stringify(added));
    console.log('Acceso de clientes guardado en .local/clientes-demo.json (excluido de Git).');
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  } finally {
    db.release();
  }
}
main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => pool.end());
