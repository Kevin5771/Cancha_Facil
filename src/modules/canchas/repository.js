function crearRepositorio({ query }) {
  return {
    listarActivas: (params, connection) =>
      (connection || { query }).query(
        `SELECT c.id,c.nombre,c.tipo,c.descripcion,c.tarifa_referencia,c.activa,
          coalesce(v.promedio,0)::float AS calificacion,coalesce(v.votos,0)::int AS votos
          FROM canchas c LEFT JOIN (SELECT cancha_id,round(avg(puntuacion),1) AS promedio,count(*) AS votos
            FROM calificaciones_cancha GROUP BY cancha_id) v ON v.cancha_id=c.id
          WHERE c.activa=TRUE ORDER BY c.id`,
        params,
      ),
    listarTodas: (params, connection) =>
      (connection || { query }).query(
        "SELECT id,nombre,tipo,descripcion,tarifa_referencia,activa FROM canchas ORDER BY id",
        params,
      ),
    insertar: (params, connection) =>
      (connection || { query }).query(
        "INSERT INTO canchas(nombre,tipo,descripcion,tarifa_referencia,activa) VALUES($1,$2,$3,$4,$5) RETURNING *",
        params,
      ),
    actualizar: (params, connection) =>
      (connection || { query }).query(
        "UPDATE canchas SET nombre=$1,tipo=$2,descripcion=$3,tarifa_referencia=$4,activa=$5 WHERE id=$6 RETURNING *",
        params,
      ),
    buscarActiva: (params, connection) =>
      (connection || { query }).query(
        "SELECT id,nombre FROM canchas WHERE id=$1 AND activa=TRUE",
        params,
      ),
    listarHorariosActivos: (params, connection) =>
      (connection || { query }).query(
        "SELECT id,hora_inicio::text,hora_fin::text FROM horarios WHERE cancha_id=$1 AND dia_semana=$2 AND activo=TRUE ORDER BY hora_inicio",
        params,
      ),
    listarReservasActivas: (params, connection) =>
      (connection || { query }).query(
        "SELECT hora_inicio::text,hora_fin::text FROM reservaciones WHERE cancha_id=$1 AND fecha=$2 AND estado IN ('PENDIENTE','CONFIRMADA')",
        params,
      ),
  };
}
module.exports = { crearRepositorio };
