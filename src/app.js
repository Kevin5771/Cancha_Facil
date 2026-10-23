const express = require("express"),
  helmet = require("helmet"),
  cookieParser = require("cookie-parser"),
  path = require("path");
const { errorHandler, HttpError } = require("./shared/http");
function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'", "https://api.open-meteo.com"],
          objectSrc: ["'none'"],
        },
      },
    }),
  );
  app.use(express.json({ limit: "32kb" }));
  app.use(cookieParser());
  // Las peticiones que modifican datos deben provenir del mismo origen (defensa CSRF).
  app.use("/api", (req, res, next) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && req.get("origin")) {
      try {
        if (new URL(req.get("origin")).host !== req.get("host"))
          throw new Error();
      } catch {
        return next(new HttpError(403, "Origen no autorizado."));
      }
    }
    next();
  });
  app.get("/api/health", (_req, res) =>
    res.json({ estado: "ok", app: "CanchaFácil" }),
  );
  app.use("/api/auth", require("./modules/auth/routes"));
  app.use("/api/canchas", require("./modules/canchas/routes"));
  app.use("/api/horarios", require("./modules/horarios/routes"));
  app.use("/api/reservaciones", require("./modules/reservas/routes"));
  app.use("/api/admin", require("./modules/admin/routes"));
  app.use("/api/comunidad", require("./modules/comunidad/routes"));
  app.use("/api", (req, res, next) =>
    next(new HttpError(404, "Ruta API no encontrada.")),
  );
  app.use(express.static(path.join(__dirname, "..", "public")));
  app.get("*", (req, res) =>
    res.sendFile(path.join(__dirname, "..", "public", "index.html")),
  );
  app.use(errorHandler);
  return app;
}
module.exports = { createApp };
