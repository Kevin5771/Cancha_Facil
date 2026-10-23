const emailValido = (s) =>
  typeof s === "string" &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) &&
  s.length <= 254;
const enteroPositivo = (v) =>
  /^\d+$/.test(String(v ?? "")) &&
  Number(v) > 0 &&
  Number.isSafeInteger(Number(v));
const fechaISOValida = (s) => {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T12:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};
const horaValida = (s) =>
  typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
const fechaHoyLocal = (
  zona = process.env.APP_TIMEZONE || "America/Guatemala",
) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zona,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const o = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${o.year}-${o.month}-${o.day}`;
};
const horaHoyLocal = (
  zona = process.env.APP_TIMEZONE || "America/Guatemala",
) => {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: zona,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const v = Object.fromEntries(p.map((x) => [x.type, x.value]));
  return `${v.hour}:${v.minute}`;
};
const diaSemanaISO = (fecha) => new Date(fecha + "T12:00:00Z").getUTCDay();
const segundos = (hora) => {
  const [h, m, s = 0] = String(hora).split(":").map(Number);
  return h * 3600 + m * 60 + s;
};
const intervalosSeCruzan = (a, b, c, d) =>
  segundos(a) < segundos(d) && segundos(c) < segundos(b);
const estadoPermiteReserva = (estado) =>
  ["PENDIENTE", "CONFIRMADA"].includes(estado);
module.exports = {
  emailValido,
  enteroPositivo,
  fechaISOValida,
  horaValida,
  fechaHoyLocal,
  horaHoyLocal,
  diaSemanaISO,
  intervalosSeCruzan,
  estadoPermiteReserva,
};
