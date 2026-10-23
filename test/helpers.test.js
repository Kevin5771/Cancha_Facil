const test = require("node:test");
const assert = require("node:assert/strict");
const {
  emailValido,
  enteroPositivo,
  fechaISOValida,
  horaValida,
  diaSemanaISO,
  intervalosSeCruzan,
} = require("../src/lib/helpers");
test("HU-01 registro: se rechazan correos incorrectos", () => {
  assert.equal(emailValido("cliente@ejemplo.com"), true);
  assert.equal(emailValido("mal-correo"), false);
});
test("Validaciones: números enteros positivos", () => {
  assert.equal(enteroPositivo("42"), true);
  assert.equal(enteroPositivo("-2"), false);
  assert.equal(enteroPositivo("1.5"), false);
});
test("HU-04: fecha imposible no es válida", () => {
  assert.equal(fechaISOValida("2026-02-30"), false);
  assert.equal(fechaISOValida("2028-02-29"), true);
});
test("HU-09: rangos de hora válidos", () => {
  assert.equal(horaValida("09:30"), true);
  assert.equal(horaValida("25:00"), false);
});
test("HU-05: franjas iguales o superpuestas se detectan", () => {
  assert.equal(intervalosSeCruzan("09:00", "10:00", "09:00", "10:00"), true);
  assert.equal(intervalosSeCruzan("09:00", "10:00", "09:30", "10:30"), true);
});
test("HU-05: franjas consecutivas NO se cruzan", () => {
  assert.equal(intervalosSeCruzan("09:00", "10:00", "10:00", "11:00"), false);
});
test("Disponibilidad: día de semana 0=domingo", () => {
  assert.equal(diaSemanaISO("2026-10-18"), 0);
  assert.equal(diaSemanaISO("2026-10-19"), 1);
});
