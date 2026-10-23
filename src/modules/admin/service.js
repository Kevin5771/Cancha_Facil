const { crearRepositorio } = require("./repository");
const { HttpError } = require("../../shared/http");
const {
  enteroPositivo,
  fechaISOValida,
  fechaHoyLocal,
} = require("../../shared/validation");

function crearServicio(database) {
  const repository = crearRepositorio(database);
  async function listarReservaciones(input) {
    const { fecha, cancha_id, estado, cliente } = input.query;
    if (fecha && !fechaISOValida(fecha))
      throw new HttpError(400, "Fecha inválida.");
    if (cancha_id && !enteroPositivo(cancha_id))
      throw new HttpError(400, "Cancha inválida.");
    if (
      estado &&
      !["PENDIENTE", "CONFIRMADA", "CANCELADA", "FINALIZADA"].includes(estado)
    )
      throw new HttpError(400, "Estado inválido.");
    const r = await repository.listarReservaciones([
      fecha || null,
      cancha_id || null,
      estado || null,
      cliente?.trim() || null,
    ]);
    return { reservaciones: r.rows };
  }
  async function cambiarEstado(input) {
    const estado = input.body?.estado;
    if (
      !enteroPositivo(input.params.id) ||
      !["CONFIRMADA", "CANCELADA", "FINALIZADA"].includes(estado)
    )
      throw new HttpError(400, "Estado o ID inválido.");
    // Cancelar es permanente. Finalizar solo una reserva confirmada.
    const allowed =
      estado === "CONFIRMADA"
        ? ["PENDIENTE"]
        : estado === "FINALIZADA"
          ? ["CONFIRMADA"]
          : ["PENDIENTE", "CONFIRMADA"];
    const r = await repository.cambiarEstado([
      estado,
      input.params.id,
      allowed,
      process.env.APP_TIMEZONE || "America/Guatemala",
    ]);
    if (!r.rowCount)
      throw new HttpError(
        409,
        "No es posible realizar esa transición de estado.",
      );
    return { reservacion: r.rows[0] };
  }
  async function consultarResumen(input) {
    const total = await repository.contarReservaciones([fechaHoyLocal()]);
    const canchas = await repository.contarCanchasActivas([]);
    return { ...total.rows[0], canchas_activas: canchas.rows[0].activas };
  }
  return { listarReservaciones, cambiarEstado, consultarResumen };
}
module.exports = { crearServicio };
