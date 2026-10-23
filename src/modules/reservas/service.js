const { crearRepositorio } = require("./repository");
const { HttpError } = require("../../shared/http");
const {
  enteroPositivo,
  fechaISOValida,
  fechaHoyLocal,
  horaHoyLocal,
  diaSemanaISO,
} = require("../../shared/validation");

function crearServicio(database) {
  const { pool } = database;
  const repository = crearRepositorio(database);
  async function listarPropias(input) {
    const r = await repository.listarPorCliente([input.usuario.id]);
    return { reservaciones: r.rows };
  }
  async function crear(input) {
    const { cancha_id, horario_id, fecha } = input.body || {};
    if (
      !enteroPositivo(cancha_id) ||
      !enteroPositivo(horario_id) ||
      !fechaISOValida(fecha) ||
      fecha < fechaHoyLocal()
    )
      throw new HttpError(
        400,
        "Selecciona cancha, fecha futura o de hoy y horario válido.",
      );
    const db = await pool.connect();
    try {
      await db.query("BEGIN");
      const u = await repository.buscarClienteActivo([input.usuario.id], db);
      if (!u.rowCount) throw new HttpError(401, "Cuenta inactiva.");
      const horario = await repository.buscarHorarioDisponible(
        [horario_id, cancha_id],
        db,
      );
      if (
        !horario.rowCount ||
        Number(horario.rows[0].dia_semana) !== diaSemanaISO(fecha)
      )
        throw new HttpError(
          400,
          "Horario no disponible para esta cancha y fecha.",
        );
      const h = horario.rows[0];
      if (
        fecha === fechaHoyLocal() &&
        h.hora_inicio.slice(0, 5) <= horaHoyLocal()
      )
        throw new HttpError(
          400,
          "No puedes reservar un horario que ya comenzó.",
        );
      // El EXCLUDE del schema garantiza exclusión aun si dos solicitudes llegan simultáneamente.
      const r = await repository.insertar(
        [
          input.usuario.id,
          cancha_id,
          horario_id,
          fecha,
          h.hora_inicio,
          h.hora_fin,
        ],
        db,
      );
      await db.query("COMMIT");
      return { reservacion: r.rows[0] };
    } catch (e) {
      await db.query("ROLLBACK");
      throw e;
    } finally {
      db.release();
    }
  }
  async function cancelarPropia(input) {
    if (!enteroPositivo(input.params.id))
      throw new HttpError(400, "ID inválido.");
    const r = await repository.cancelarPropia([
      input.params.id,
      input.usuario.id,
    ]);
    if (!r.rowCount)
      throw new HttpError(
        404,
        "Reserva no encontrada, no te pertenece o ya no puede cancelarse.",
      );
    return { reservacion: r.rows[0] };
  }
  return { listarPropias, crear, cancelarPropia };
}
module.exports = { crearServicio };
