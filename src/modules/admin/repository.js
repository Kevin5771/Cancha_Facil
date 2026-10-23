function crearRepositorio({ query }) {
  return {
    listarReservaciones: (params, connection) =>
      (connection || { query }).query(
        `SELECT r.id,r.fecha::text,r.hora_inicio::text,r.hora_fin::text,r.estado,c.nombre AS cancha,u.nombre AS cliente,u.correo
    FROM reservaciones r JOIN canchas c ON c.id=r.cancha_id JOIN usuarios u ON u.id=r.cliente_id
    WHERE ($1::date IS NULL OR r.fecha=$1::date) AND ($2::bigint IS NULL OR r.cancha_id=$2::bigint)
    AND ($3::text IS NULL OR r.estado=$3) AND ($4::text IS NULL OR u.nombre ILIKE '%'||$4||'%')
    ORDER BY r.fecha DESC,r.hora_inicio DESC LIMIT 500`,
        params,
      ),
    cambiarEstado: (params, connection) =>
      (connection || { query }).query(
        `UPDATE reservaciones SET estado=$1,actualizado_en=now() WHERE id=$2 AND estado = ANY($3::text[])
    AND ($1 <> 'FINALIZADA' OR (fecha + hora_fin) <= (now() AT TIME ZONE $4)) RETURNING id,estado`,
        params,
      ),
    contarReservaciones: (params, connection) =>
      (connection || { query }).query(
        `SELECT count(*)::int AS total,count(*) FILTER(WHERE fecha=$1::date)::int AS hoy,
    count(*) FILTER(WHERE estado='CONFIRMADA')::int AS confirmadas,
    count(*) FILTER(WHERE estado='CANCELADA')::int AS canceladas,
    count(*) FILTER(WHERE estado='PENDIENTE')::int AS pendientes FROM reservaciones`,
        params,
      ),
    contarCanchasActivas: (params, connection) =>
      (connection || { query }).query(
        "SELECT count(*)::int AS activas FROM canchas WHERE activa=TRUE",
        params,
      ),
  };
}
module.exports = { crearRepositorio };
