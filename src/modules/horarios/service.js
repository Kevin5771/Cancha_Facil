const { crearRepositorio } = require("./repository");
const { HttpError } = require("../../shared/http");
const {
  enteroPositivo,
  horaValida,
  intervalosSeCruzan,
} = require("../../shared/validation");

function crearServicio(database) {
  const repository = crearRepositorio(database);
  async function listar(input) {
    if (!enteroPositivo(input.query.cancha_id))
      throw new HttpError(400, "Selecciona una cancha.");
    const r = await repository.listarPorCancha([input.query.cancha_id]);
    return { horarios: r.rows };
  }
  async function crear(input) {
    const { cancha_id, dia_semana, hora_inicio, hora_fin } = input.body || {};
    if (
      !enteroPositivo(cancha_id) ||
      !Number.isInteger(Number(dia_semana)) ||
      Number(dia_semana) < 0 ||
      Number(dia_semana) > 6 ||
      !horaValida(hora_inicio) ||
      !horaValida(hora_fin) ||
      hora_inicio >= hora_fin
    )
      throw new HttpError(400, "Revisa cancha, día y rango horario (HH:MM).");
    const existentes = await repository.listarActivosPorDia([
      cancha_id,
      dia_semana,
    ]);
    if (
      existentes.rows.some((h) =>
        intervalosSeCruzan(hora_inicio, hora_fin, h.hora_inicio, h.hora_fin),
      )
    )
      throw new HttpError(
        409,
        "Ya existe un horario activo que se cruza con ese horario.",
      );
    const r = await repository.insertar([
      cancha_id,
      dia_semana,
      hora_inicio,
      hora_fin,
    ]);
    return { horario: r.rows[0] };
  }
  async function cambiarEstado(input) {
    if (
      !enteroPositivo(input.params.id) ||
      typeof input.body?.activo !== "boolean"
    )
      throw new HttpError(400, "ID o estado inválido.");
    // Al reactivar, no se permiten franjas semanales activas superpuestas.
    if (input.body.activo) {
      const base = await repository.buscarPorId([input.params.id]);
      if (!base.rowCount) throw new HttpError(404, "Horario no encontrado.");
      const h = base.rows[0],
        otros = await repository.listarOtrosActivos([
          h.cancha_id,
          h.dia_semana,
          h.id,
        ]);
      if (
        otros.rows.some((x) =>
          intervalosSeCruzan(
            h.hora_inicio,
            h.hora_fin,
            x.hora_inicio,
            x.hora_fin,
          ),
        )
      )
        throw new HttpError(409, "Este horario se cruza con otro activo.");
    }
    const r = await repository.cambiarEstado([
      input.body.activo,
      input.params.id,
    ]);
    if (!r.rowCount) throw new HttpError(404, "Horario no encontrado.");
    return { horario: r.rows[0] };
  }
  return { listar, crear, cambiarEstado };
}
module.exports = { crearServicio };
