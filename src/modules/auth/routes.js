const router = require("express").Router();
const { asyncRoute } = require("../../shared/http");
const {
  crearSesion,
  borrarSesion,
  requerirSesion,
} = require("../../shared/session");
const database = require("../../infrastructure/database/postgres");
const service = require("./service").crearServicio(database);
router.post(
  "/registro",
  asyncRoute(async (req, res) => {
    const usuario = await service.registrar(req.body);
    crearSesion(res, usuario);
    res.status(201).json({ usuario });
  }),
);
router.post(
  "/login",
  asyncRoute(async (req, res) => {
    const usuario = await service.autenticar(req.body);
    crearSesion(res, usuario);
    res.json({ usuario });
  }),
);
router.post("/logout", (_req, res) => {
  borrarSesion(res);
  res.json({ mensaje: "Sesión cerrada." });
});
router.get(
  "/me",
  requerirSesion,
  asyncRoute(async (req, res) => {
    res.json({ usuario: await service.consultarUsuario(req.usuario.id) });
  }),
);
module.exports = router;
