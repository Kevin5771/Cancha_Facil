const jwt = require("jsonwebtoken");
const { HttpError } = require("./http");
const COOKIE = "cf_sesion";
function crearSesion(res, usuario) {
  const token = jwt.sign(
    { sub: String(usuario.id), rol: usuario.rol },
    process.env.JWT_SECRET,
    { expiresIn: "8h" },
  );
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 8 * 60 * 60 * 1000,
    path: "/",
  });
}
function borrarSesion(res) {
  res.clearCookie(COOKIE, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}
function requerirSesion(req, res, next) {
  try {
    const token = req.cookies[COOKIE];
    if (!token) throw new Error("Falta sesión");
    const p = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
    if (!/^\d+$/.test(String(p.sub))) throw new Error("Sesión inválida");
    req.usuario = { id: Number(p.sub), rol: p.rol };
    next();
  } catch {
    next(new HttpError(401, "Inicia sesión para continuar."));
  }
}
const requerirAdmin = (req, res, next) =>
  req.usuario?.rol === "ADMIN"
    ? next()
    : next(new HttpError(403, "Acceso denegado."));
module.exports = { crearSesion, borrarSesion, requerirSesion, requerirAdmin };
