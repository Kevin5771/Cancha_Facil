function crearRepositorio({ query }) {
  return {
    buscarCancha: (id) =>
      query(
        "SELECT id,nombre,tipo,descripcion,activa FROM canchas WHERE id=$1",
        [id],
      ),
    buscarUsuario: (id) =>
      query("SELECT id FROM usuarios WHERE id=$1 AND activo=TRUE", [id]),
    resumen: (id) =>
      query(
        `SELECT count(*)::int AS votos, coalesce(round(avg(puntuacion),1),0)::float AS promedio,
      count(*) FILTER (WHERE puntuacion=5)::int AS cinco,
      count(*) FILTER (WHERE puntuacion=4)::int AS cuatro,
      count(*) FILTER (WHERE puntuacion=3)::int AS tres,
      count(*) FILTER (WHERE puntuacion=2)::int AS dos,
      count(*) FILTER (WHERE puntuacion=1)::int AS uno
      FROM calificaciones_cancha WHERE cancha_id=$1`,
        [id],
      ),
    comentarios: (id, antes) =>
      query(
        `SELECT m.id::text,m.usuario_id::text,m.contenido,m.eliminado,m.creado_en,
      split_part(u.nombre,' ',1) AS autor,m.respuesta_a::text,
      CASE WHEN p.eliminado THEN 'Comentario eliminado' ELSE left(p.contenido,120) END AS respuesta_contenido,
      split_part(pu.nombre,' ',1) AS respuesta_autor
      FROM comentarios_cancha m JOIN usuarios u ON u.id=m.usuario_id
      LEFT JOIN comentarios_cancha p ON p.id=m.respuesta_a
      LEFT JOIN usuarios pu ON pu.id=p.usuario_id
      WHERE m.cancha_id=$1 AND ($2::bigint IS NULL OR m.id<$2::bigint)
      ORDER BY m.id DESC LIMIT 31`,
        [id, antes || null],
      ),
    buscarComentario: (id) =>
      query(
        "SELECT id,cancha_id,eliminado FROM comentarios_cancha WHERE id=$1",
        [id],
      ),
    insertarComentario: (id, usuario, contenido, respuesta) =>
      query(
        `INSERT INTO comentarios_cancha(cancha_id,usuario_id,contenido,respuesta_a)
      VALUES($1,$2,$3,$4) RETURNING id::text`,
        [id, usuario, contenido, respuesta || null],
      ),
    miCalificacion: (id, usuario) =>
      query(
        "SELECT puntuacion FROM calificaciones_cancha WHERE cancha_id=$1 AND usuario_id=$2",
        [id, usuario],
      ),
    calificar: (id, usuario, puntuacion) =>
      query(
        `INSERT INTO calificaciones_cancha(cancha_id,usuario_id,puntuacion)
      VALUES($1,$2,$3) ON CONFLICT(cancha_id,usuario_id) DO UPDATE SET puntuacion=EXCLUDED.puntuacion,actualizado_en=now()
      RETURNING puntuacion`,
        [id, usuario, puntuacion],
      ),
    eliminarComentario: (id, usuario, admin) =>
      query(
        `UPDATE comentarios_cancha SET eliminado=TRUE,contenido='Comentario eliminado'
      WHERE id=$1 AND (usuario_id=$2 OR $3::boolean) AND eliminado=FALSE RETURNING id::text`,
        [id, usuario, admin],
      ),
  };
}
module.exports = { crearRepositorio };
