require('dotenv').config();
const { Client } = require('pg');
const fs = require('node:fs');
const path = require('node:path');

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('Configura DATABASE_URL en .env');
  const url = new URL(process.env.DATABASE_URL);
  const database = decodeURIComponent(url.pathname.slice(1));
  if (!database) throw new Error('DATABASE_URL debe indicar el nombre de la base.');
  const maintenanceUrl = new URL(url);
  maintenanceUrl.pathname = '/postgres';
  const maintenance = new Client({ connectionString: maintenanceUrl.toString() });
  try {
    await maintenance.connect();
    const exists = await maintenance.query('SELECT 1 FROM pg_database WHERE datname=$1', [database]);
    if (!exists.rowCount) {
      const quotedName = '"' + database.replaceAll('"', '""') + '"';
      await maintenance.query(`CREATE DATABASE ${quotedName}`);
    }
  } finally {
    await maintenance.end();
  }
  const client = new Client({ connectionString: url.toString() });
  try {
    await client.connect();
    const schema = fs.readFileSync(path.join(__dirname, '../database/schema.sql'), 'utf8');
    await client.query('BEGIN');
    await client.query(schema);
    await client.query('COMMIT');
    console.log('Base de datos y esquema preparados correctamente.');
  } finally {
    // Cerrar la conexión también revierte cualquier transacción fallida.
    await client.end();
  }
}
main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
