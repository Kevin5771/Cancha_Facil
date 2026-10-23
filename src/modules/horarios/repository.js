function crearRepositorio({ query }) {
  return {
    listarPorCancha: (params, connection) =>
      (connection || { query }).query(
        "SELECT id,cancha_id,dia_semana,hora_inicio::text,hora_fin::text,activo FROM horarios WHERE cancha_id=$1 ORDER BY dia_semana,hora_inicio",
        params,
      ),
    listarActivosPorDia: (params, connection) =>
      (connection || { query }).query(
        "SELECT hora_inicio::text,hora_fin::text FROM horarios WHERE cancha_id=$1 AND dia_semana=$2 AND activo=TRUE",
        params,
      ),
    insertar: (params, connection) =>
      (connection || { query }).query(
        "INSERT INTO horarios(cancha_id,dia_semana,hora_inicio,hora_fin) VALUES($1,$2,$3,$4) RETURNING id,cancha_id,dia_semana,hora_inicio::text,hora_fin::text,activo",
        params,
      ),
    buscarPorId: (params, connection) =>
      (connection || { query }).query(
        "SELECT * FROM horarios WHERE id=$1",
        params,
      ),
    listarOtrosActivos: (params, connection) =>
      (connection || { query }).query(
        "SELECT hora_inicio::text,hora_fin::text FROM horarios WHERE cancha_id=$1 AND dia_semana=$2 AND id<>$3 AND activo=TRUE",
        params,
      ),
    cambiarEstado: (params, connection) =>
      (connection || { query }).query(
        "UPDATE horarios SET activo=$1 WHERE id=$2 RETURNING id,activo",
        params,
      ),
  };
}
module.exports = { crearRepositorio };
