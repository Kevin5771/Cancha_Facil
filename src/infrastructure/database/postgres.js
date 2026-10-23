require("dotenv").config();
const { Pool } = require("pg");
if (!process.env.DATABASE_URL)
  throw new Error("Configura DATABASE_URL en .env");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.on("error", (error) =>
  console.error("Conexión PostgreSQL inactiva:", error.message),
);
module.exports = { pool, query: (...args) => pool.query(...args) };
