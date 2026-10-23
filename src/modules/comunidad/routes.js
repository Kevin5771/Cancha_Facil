const router = require("express").Router();
const { asyncRoute } = require("../../shared/http");
const { requerirSesion } = require("../../shared/session");
const database = require("../../infrastructure/database/postgres");
const service = require("./service").crearServicio(database);
router.get(
  "/canchas/:id",
  asyncRoute(async (req, res) => {
    res.json(
      await service.consultar({ id: req.params.id, antes: req.query.antes }),
    );
  }),
);
router.get(
  "/canchas/:id/calificacion",
  requerirSesion,
  asyncRoute(async (req, res) => {
    res.json(
      await service.miCalificacion({ id: req.params.id, usuario: req.usuario }),
    );
  }),
);
router.put(
  "/canchas/:id/calificacion",
  requerirSesion,
  asyncRoute(async (req, res) => {
    res.json(
      await service.calificar({
        id: req.params.id,
        usuario: req.usuario,
        puntuacion: req.body?.puntuacion,
      }),
    );
  }),
);
router.post(
  "/canchas/:id/comentarios",
  requerirSesion,
  asyncRoute(async (req, res) => {
    res
      .status(201)
      .json(
        await service.publicar({
          id: req.params.id,
          usuario: req.usuario,
          body: req.body || {},
        }),
      );
  }),
);
router.delete(
  "/comentarios/:id",
  requerirSesion,
  asyncRoute(async (req, res) => {
    res.json(
      await service.eliminar({ id: req.params.id, usuario: req.usuario }),
    );
  }),
);
module.exports = router;
