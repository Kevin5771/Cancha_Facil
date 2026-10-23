const router = require("express").Router();
const { asyncRoute } = require("../../shared/http");
const { requerirSesion, requerirAdmin } = require("../../shared/session");
const database = require("../../infrastructure/database/postgres");
const service = require("./service").crearServicio(database);
router.use(requerirSesion);
router.get(
  "/mias",
  asyncRoute(async (req, res) => {
    const result = await service.listarPropias({
      body: req.body,
      query: req.query,
      params: req.params,
      usuario: req.usuario,
    });
    res.status(200).json(result);
  }),
);
router.post(
  "/",
  asyncRoute(async (req, res) => {
    const result = await service.crear({
      body: req.body,
      query: req.query,
      params: req.params,
      usuario: req.usuario,
    });
    res.status(201).json(result);
  }),
);
router.patch(
  "/:id/cancelar",
  asyncRoute(async (req, res) => {
    const result = await service.cancelarPropia({
      body: req.body,
      query: req.query,
      params: req.params,
      usuario: req.usuario,
    });
    res.status(200).json(result);
  }),
);
module.exports = router;
