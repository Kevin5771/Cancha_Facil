require("dotenv").config();
function serverPort() {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("PORT debe ser un número entre 1 y 65535 en .env.");
  return port;
}
async function startServer() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)
    throw new Error("JWT_SECRET debe tener por lo menos 32 caracteres en .env.");
  const port = serverPort();
  const { createApp } = require("./app");
  return new Promise((resolve, reject) => {
    const server = createApp().listen(port);
    server.once("error", async (error) => {
      await require("./infrastructure/database/postgres").pool.end();
      reject(new Error(error.code === "EADDRINUSE"
        ? `El puerto ${port} está ocupado. Usa npm start para comprobar si CanchaFácil ya está abierto, o cambia PORT en .env.`
        : `No se pudo iniciar el servidor (${error.code || "error de red"}).`));
    });
    server.once("listening", () => {
      console.log(`CanchaFácil en http://localhost:${port}`);
      resolve(server);
    });
  });
}
if (require.main === module) startServer().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
module.exports = { startServer, serverPort };
