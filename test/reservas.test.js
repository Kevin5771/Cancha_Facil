const test = require("node:test");
const assert = require("node:assert/strict");
const { crearServicio } = require("../src/modules/reservas/service");
const { diaSemanaISO } = require("../src/shared/validation");

const fecha = "2099-01-05";
const solicitud = () => ({
  body: { cancha_id: 2, horario_id: 3, fecha, cliente_id: 999 },
  usuario: { id: 7 },
  params: {},
  query: {},
});

function escenario({
  falloInsercion,
  usuarioActivo = true,
  dia = diaSemanaISO(fecha),
} = {}) {
  const comandos = [];
  let liberada = false;
  const connection = {
    async query(sql, params) {
      comandos.push({ sql, params });
      if (sql.includes("FROM usuarios"))
        return { rowCount: usuarioActivo ? 1 : 0, rows: [] };
      if (sql.includes("FROM horarios"))
        return {
          rowCount: 1,
          rows: [
            {
              id: 3,
              dia_semana: dia,
              hora_inicio: "09:00:00",
              hora_fin: "10:00:00",
            },
          ],
        };
      if (sql.includes("INSERT INTO reservaciones")) {
        if (falloInsercion) throw falloInsercion;
        return { rowCount: 1, rows: [{ id: 42, estado: "PENDIENTE" }] };
      }
      return { rows: [], rowCount: 0 };
    },
    release() {
      liberada = true;
    },
  };
  const database = {
    query() {
      throw new Error("La reserva debe usar la misma conexión transaccional");
    },
    pool: {
      async connect() {
        return connection;
      },
    },
  };
  return {
    service: crearServicio(database),
    comandos,
    liberada: () => liberada,
  };
}

test("reservar usa el cliente autenticado, confirma y libera la misma conexión", async () => {
  const caso = escenario();
  assert.deepEqual(await caso.service.crear(solicitud()), {
    reservacion: { id: 42, estado: "PENDIENTE" },
  });
  const insert = caso.comandos.find((c) =>
    c.sql.includes("INSERT INTO reservaciones"),
  );
  assert.deepEqual(insert.params, [7, 2, 3, fecha, "09:00:00", "10:00:00"]);
  assert.equal(caso.comandos[0].sql, "BEGIN");
  assert.equal(caso.comandos.at(-1).sql, "COMMIT");
  assert.equal(caso.liberada(), true);
});

test("conflicto SQL revierte, conserva el error para HTTP 409 y libera conexión", async () => {
  const conflicto = Object.assign(new Error("solapamiento"), { code: "23P01" });
  const caso = escenario({ falloInsercion: conflicto });
  await assert.rejects(
    caso.service.crear(solicitud()),
    (error) => error === conflicto,
  );
  assert.equal(caso.comandos.at(-1).sql, "ROLLBACK");
  assert.equal(
    caso.comandos.some((c) => c.sql === "COMMIT"),
    false,
  );
  assert.equal(caso.liberada(), true);
});

test("cuenta inactiva y día incorrecto impiden insertar y revierten", async () => {
  for (const [opciones, estado] of [
    [{ usuarioActivo: false }, 401],
    [{ dia: (diaSemanaISO(fecha) + 1) % 7 }, 400],
  ]) {
    const caso = escenario(opciones);
    await assert.rejects(caso.service.crear(solicitud()), { status: estado });
    assert.equal(
      caso.comandos.some((c) => c.sql.includes("INSERT")),
      false,
    );
    assert.equal(caso.comandos.at(-1).sql, "ROLLBACK");
    assert.equal(caso.liberada(), true);
  }
});

test("fecha imposible se rechaza antes de abrir una transacción", async () => {
  const caso = escenario();
  const input = solicitud();
  input.body.fecha = "2099-02-30";
  await assert.rejects(caso.service.crear(input), { status: 400 });
  assert.equal(caso.comandos.length, 0);
});

test("cancelación limita la actualización al propietario autenticado", async () => {
  let parametros;
  const service = crearServicio({
    query: async (sql, params) => {
      assert.match(sql, /cliente_id=\$2/);
      parametros = params;
      return { rowCount: 0, rows: [] };
    },
  });
  await assert.rejects(
    service.cancelarPropia({ params: { id: "42" }, usuario: { id: 7 } }),
    { status: 404 },
  );
  assert.deepEqual(parametros, ["42", 7]);
});
