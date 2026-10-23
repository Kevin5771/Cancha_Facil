const router = require("express").Router();
const { asyncRoute } = require("../../shared/http");
const { requerirSesion, requerirAdmin } = require("../../shared/session");
const database = require("../../infrastructure/database/postgres");
const service = require("./service").crearServicio(database);
router.use(requerirSesion, requerirAdmin);
router.get(
  "/reservaciones",
  asyncRoute(async (req, res) => {
    const result = await service.listarReservaciones({
      body: req.body,
      query: req.query,
      params: req.params,
      usuario: req.usuario,
    });
    res.status(200).json(result);
  }),
);
router.patch(
  "/reservaciones/:id/estado",
  asyncRoute(async (req, res) => {
    const result = await service.cambiarEstado({
      body: req.body,
      query: req.query,
      params: req.params,
      usuario: req.usuario,
    });
    res.status(200).json(result);
  }),
);
router.get(
  "/resumen",
  asyncRoute(async (req, res) => {
    const result = await service.consultarResumen({
      body: req.body,
      query: req.query,
      params: req.params,
      usuario: req.usuario,
    });
    res.status(200).json(result);
  }),
);
module.exports = router;
