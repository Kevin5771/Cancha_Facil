function crearRepositorio({ query }) {
  return {
    listarPorCliente: (params, connection) =>
      (connection || { query }).query(
        `SELECT r.id,r.fecha::text,r.hora_inicio::text,r.hora_fin::text,r.estado,c.nombre AS cancha
  FROM reservaciones r JOIN canchas c ON c.id=r.cancha_id WHERE r.cliente_id=$1 ORDER BY r.fecha DESC,r.hora_inicio DESC`,
        params,
      ),
    buscarClienteActivo: (params, connection) =>
      (connection || { query }).query(
        "SELECT id FROM usuarios WHERE id=$1 AND activo=TRUE",
        params,
      ),
    buscarHorarioDisponible: (params, connection) =>
      (connection || { query }).query(
        `SELECT h.id,h.dia_semana,h.hora_inicio::text,h.hora_fin::text FROM horarios h
      JOIN canchas c ON c.id=h.cancha_id WHERE h.id=$1 AND h.cancha_id=$2 AND h.activo=TRUE AND c.activa=TRUE`,
        params,
      ),
    insertar: (params, connection) =>
      (connection || { query }).query(
        `INSERT INTO reservaciones(cliente_id,cancha_id,horario_id,fecha,hora_inicio,hora_fin)
      VALUES($1,$2,$3,$4,$5,$6) RETURNING id,fecha::text,hora_inicio::text,hora_fin::text,estado`,
        params,
      ),
    cancelarPropia: (params, connection) =>
      (connection || { query }).query(
        `UPDATE reservaciones SET estado='CANCELADA',actualizado_en=now()
    WHERE id=$1 AND cliente_id=$2 AND estado IN ('PENDIENTE','CONFIRMADA')
    RETURNING id,estado`,
        params,
      ),
  };
}
module.exports = { crearRepositorio };
