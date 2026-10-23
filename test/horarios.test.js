const test = require("node:test");
const assert = require("node:assert/strict");
const { intervalosSeCruzan } = require("../src/shared/validation");
test("horarios consecutivos conservan igualdad entre HH:MM y TIME de PostgreSQL", () => {
  assert.equal(
    intervalosSeCruzan("09:00", "10:00", "08:00:00", "09:00:00"),
    false,
  );
  assert.equal(
    intervalosSeCruzan("08:00", "09:00", "09:00:00", "10:00:00"),
    false,
  );
  assert.equal(
    intervalosSeCruzan("08:30", "09:30", "09:00:00", "10:00:00"),
    true,
  );
});
