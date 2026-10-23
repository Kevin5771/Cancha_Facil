function crearRepositorio({ query }) {
  return {
    insertarCliente: (params, connection) =>
      (connection || { query }).query(
        `INSERT INTO usuarios(nombre,correo,password_hash,telefono)
      VALUES($1,$2,$3,$4) RETURNING id,nombre,correo,rol`,
        params,
      ),
    buscarCredenciales: (params, connection) =>
      (connection || { query }).query(
        `SELECT id,nombre,correo,rol,password_hash FROM usuarios
      WHERE lower(correo)=lower($1) AND activo=TRUE`,
        params,
      ),
    buscarUsuarioActivo: (params, connection) =>
      (connection || { query }).query(
        "SELECT id,nombre,correo,rol FROM usuarios WHERE id=$1 AND activo=TRUE",
        params,
      ),
  };
}
module.exports = { crearRepositorio };
