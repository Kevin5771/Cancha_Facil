const { crearRepositorio } = require("./repository");
const { HttpError } = require("../../shared/http");
const { enteroPositivo } = require("../../shared/validation");
function crearServicio(database) {
  const repository = crearRepositorio(database);
  async function canchaValida(id) {
    if (!enteroPositivo(id)) throw new HttpError(400, "Cancha inválida.");
    const result = await repository.buscarCancha(id);
    if (!result.rowCount) throw new HttpError(404, "Cancha no encontrada.");
    return result.rows[0];
  }
  async function cuentaActiva(usuario) {
    if (!usuario || !(await repository.buscarUsuario(usuario.id)).rowCount)
      throw new HttpError(401, "Inicia sesión con una cuenta activa.");
  }
  async function consultar({ id, antes }) {
    const cancha = await canchaValida(id);
    if (antes && !enteroPositivo(antes))
      throw new HttpError(400, "Cursor inválido.");
    const [summary, messages] = await Promise.all([
      repository.resumen(id),
      repository.comentarios(id, antes),
    ]);
    const hayAnteriores = messages.rows.length > 30;
    const comentarios = messages.rows
      .slice(0, 30)
      .reverse()
      .map((m) => ({
        ...m,
        contenido: m.eliminado ? "Comentario eliminado" : m.contenido,
      }));
    return { cancha, resumen: summary.rows[0], comentarios, hayAnteriores };
  }
  async function publicar({ id, usuario, body = {} }) {
    const cancha = await canchaValida(id);
    await cuentaActiva(usuario);
    if (!cancha.activa)
      throw new HttpError(
        409,
        "La conversación de esta cancha está en modo lectura.",
      );
    if (
      typeof body.contenido !== "string" ||
      !body.contenido.trim() ||
      body.contenido.trim().length > 1000
    )
      throw new HttpError(400, "Escribe un mensaje de 1 a 1000 caracteres.");
    if (body.respuesta_a != null) {
      if (!enteroPositivo(body.respuesta_a))
        throw new HttpError(400, "Respuesta inválida.");
      const parent = await repository.buscarComentario(body.respuesta_a);
      if (
        !parent.rowCount ||
        String(parent.rows[0].cancha_id) !== String(id) ||
        parent.rows[0].eliminado
      )
        throw new HttpError(
          400,
          "El mensaje al que respondes no está disponible en esta cancha.",
        );
    }
    const result = await repository.insertarComentario(
      id,
      usuario.id,
      body.contenido.trim(),
      body.respuesta_a,
    );
    return { comentario: result.rows[0] };
  }
  async function miCalificacion({ id, usuario }) {
    await canchaValida(id);
    await cuentaActiva(usuario);
    const result = await repository.miCalificacion(id, usuario.id);
    return { puntuacion: result.rows[0]?.puntuacion || null };
  }
  async function calificar({ id, usuario, puntuacion }) {
    const cancha = await canchaValida(id);
    await cuentaActiva(usuario);
    if (!cancha.activa) throw new HttpError(409, "La cancha está inactiva.");
    if (!Number.isInteger(puntuacion) || puntuacion < 1 || puntuacion > 5)
      throw new HttpError(400, "Selecciona de 1 a 5 estrellas.");
    const result = await repository.calificar(id, usuario.id, puntuacion);
    return { puntuacion: result.rows[0].puntuacion };
  }
  async function eliminar({ id, usuario }) {
    if (!enteroPositivo(id)) throw new HttpError(400, "Mensaje inválido.");
    await cuentaActiva(usuario);
    const result = await repository.eliminarComentario(
      id,
      usuario.id,
      usuario.rol === "ADMIN",
    );
    if (!result.rowCount)
      throw new HttpError(
        404,
        "Mensaje no encontrado o sin permiso para eliminarlo.",
      );
    return { mensaje: "Comentario eliminado." };
  }
  return { consultar, publicar, miCalificacion, calificar, eliminar };
}
module.exports = { crearServicio };
