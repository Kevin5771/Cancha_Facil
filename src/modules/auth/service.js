const { crearRepositorio } = require("./repository");
const bcrypt = require("bcryptjs");
const { HttpError } = require("../../shared/http");
const { emailValido } = require("../../shared/validation");

function crearServicio(database) {
  const repository = crearRepositorio(database);
  async function registrar({ nombre, correo, password, telefono } = {}) {
    if (
      typeof nombre !== "string" ||
      nombre.trim().length < 2 ||
      nombre.length > 140 ||
      !emailValido(correo) ||
      typeof password !== "string" ||
      password.length < 8 ||
      password.length > 100
    ) {
      throw new HttpError(
        400,
        "Revisa nombre (mínimo 2), correo y contraseña (8 a 100 caracteres).",
      );
    }
    if (
      telefono != null &&
      (typeof telefono !== "string" || telefono.length > 30)
    ) {
      throw new HttpError(400, "Teléfono inválido.");
    }
    const hash = await bcrypt.hash(password, 12);
    const result = await repository.insertarCliente([
      nombre.trim(),
      correo.trim().toLowerCase(),
      hash,
      telefono?.trim() || null,
    ]);
    return result.rows[0];
  }
  async function autenticar({ correo, password } = {}) {
    if (!emailValido(correo) || typeof password !== "string") {
      throw new HttpError(400, "Correo o contraseña inválidos.");
    }
    const result = await repository.buscarCredenciales([correo.trim()]);
    if (
      !result.rowCount ||
      !(await bcrypt.compare(password, result.rows[0].password_hash))
    ) {
      throw new HttpError(401, "Credenciales incorrectas.");
    }
    const { password_hash, ...usuario } = result.rows[0];
    return usuario;
  }
  async function consultarUsuario(id) {
    const result = await repository.buscarUsuarioActivo([id]);
    if (!result.rowCount) throw new HttpError(401, "Cuenta no disponible.");
    return result.rows[0];
  }
  return { registrar, autenticar, consultarUsuario };
}
module.exports = { crearServicio };
