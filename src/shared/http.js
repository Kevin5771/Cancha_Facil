class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const asyncRoute = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err instanceof HttpError)
    return res.status(err.status).json({ error: err.message });
  if (err.code === "23P01" || err.code === "23505")
    return res
      .status(409)
      .json({
        error: "Conflicto: el registro ya existe o el horario está ocupado.",
      });
  if (err.code === "23503")
    return res
      .status(400)
      .json({
        error:
          "No es posible completar la operación por una referencia relacionada.",
      });
  if (err.code === "23514" || err.code === "22P02" || err.code === "22007")
    return res.status(400).json({ error: "Datos inválidos." });
  console.error("Error de servidor:", err);
  res.status(500).json({ error: "Ocurrió un error interno." });
};
module.exports = { HttpError, asyncRoute, errorHandler };
