const router = require("express").Router();
const { asyncRoute } = require("../../shared/http");
const { requerirSesion, requerirAdmin } = require("../../shared/session");
const database = require("../../infrastructure/database/postgres");
const service = require("./service").crearServicio(database);
router.get(
  "/",
  asyncRoute(async (req, res) => {
    const result = await service.listarPublicas({
      body: req.body,
      query: req.query,
      params: req.params,
      usuario: req.usuario,
    });
    res.status(200).json(result);
  }),
);
router.get(
  "/admin",
  requerirSesion,
  requerirAdmin,
  asyncRoute(async (req, res) => {
    const result = await service.listarTodas({
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
  requerirSesion,
  requerirAdmin,
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
router.put(
  "/:id",
  requerirSesion,
  requerirAdmin,
  asyncRoute(async (req, res) => {
    const result = await service.actualizar({
      body: req.body,
      query: req.query,
      params: req.params,
      usuario: req.usuario,
    });
    res.status(200).json(result);
  }),
);
router.get(
  "/:id/disponibilidad",
  asyncRoute(async (req, res) => {
    const result = await service.consultarDisponibilidad({
      body: req.body,
      query: req.query,
      params: req.params,
      usuario: req.usuario,
    });
    res.status(200).json(result);
  }),
);
module.exports = router;
