const { crearRepositorio } = require("./repository");
const { HttpError } = require("../../shared/http");
const {
  enteroPositivo,
  fechaISOValida,
  fechaHoyLocal,
  horaHoyLocal,
  diaSemanaISO,
  intervalosSeCruzan,
} = require("../../shared/validation");
const validarCancha = (o) => {
  const {
    nombre,
    tipo,
    descripcion = "",
    tarifa_referencia = null,
    activa = true,
  } = o || {};
  if (
    typeof nombre !== "string" ||
    !nombre.trim() ||
    nombre.length > 100 ||
    typeof tipo !== "string" ||
    !tipo.trim() ||
    tipo.length > 70 ||
    typeof descripcion !== "string" ||
    descripcion.length > 1500 ||
    typeof activa !== "boolean"
  )
    throw new HttpError(400, "Datos de cancha inválidos.");
  if (
    tarifa_referencia !== null &&
    (tarifa_referencia === "" ||
      !Number.isFinite(Number(tarifa_referencia)) ||
      Number(tarifa_referencia) < 0)
  )
    throw new HttpError(400, "Tarifa inválida.");
  return [
    nombre.trim(),
    tipo.trim(),
    descripcion.trim(),
    tarifa_referencia === null ? null : Number(tarifa_referencia),
    activa,
  ];
};

function crearServicio(database) {
  const repository = crearRepositorio(database);
  async function listarPublicas(input) {
    // La lista pública muestra solo canchas activas; administración usa otra ruta.
    const r = await repository.listarActivas([]);
    return { canchas: r.rows };
  }
  async function listarTodas(input) {
    const r = await repository.listarTodas([]);
    return { canchas: r.rows };
  }
  async function crear(input) {
    const v = validarCancha(input.body);
    const r = await repository.insertar(v);
    return { cancha: r.rows[0] };
  }
  async function actualizar(input) {
    if (!enteroPositivo(input.params.id))
      throw new HttpError(400, "ID inválido.");
    const v = validarCancha(input.body);
    const r = await repository.actualizar([...v, input.params.id]);
    if (!r.rowCount) throw new HttpError(404, "Cancha no encontrada.");
    return { cancha: r.rows[0] };
  }
  async function consultarDisponibilidad(input) {
    const id = input.params.id,
      fecha = input.query.fecha;
    if (!enteroPositivo(id) || !fechaISOValida(fecha))
      throw new HttpError(400, "Selecciona cancha y fecha válidas.");
    if (fecha < fechaHoyLocal())
      throw new HttpError(400, "No se permiten fechas anteriores a hoy.");
    const cancha = await repository.buscarActiva([id]);
    if (!cancha.rowCount) throw new HttpError(404, "Cancha no disponible.");
    const horarios = await repository.listarHorariosActivos([
      id,
      diaSemanaISO(fecha),
    ]);
    const reservas = await repository.listarReservasActivas([id, fecha]);
    const lista = horarios.rows.map((h) => ({
      ...h,
      disponible:
        !(
          fecha === fechaHoyLocal() &&
          h.hora_inicio.slice(0, 5) <= horaHoyLocal()
        ) &&
        !reservas.rows.some((r) =>
          intervalosSeCruzan(
            h.hora_inicio,
            h.hora_fin,
            r.hora_inicio,
            r.hora_fin,
          ),
        ),
    }));
    return { cancha: cancha.rows[0], fecha, horarios: lista };
  }
  return {
    listarPublicas,
    listarTodas,
    crear,
    actualizar,
    consultarDisponibilidad,
  };
}
module.exports = { crearServicio };
