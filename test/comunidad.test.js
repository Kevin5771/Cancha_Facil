const test = require("node:test");
const assert = require("node:assert/strict");
const { crearServicio } = require("../src/modules/comunidad/service");

function escenario({
  activa = true,
  cuenta = true,
  parent = { id: 10, cancha_id: 2, eliminado: false },
  remove = 1,
  comments = [],
} = {}) {
  const calls = [];
  const service = crearServicio({
    query: async (sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("FROM canchas WHERE"))
        return { rowCount: 1, rows: [{ id: 2, activa }] };
      if (sql.includes("FROM usuarios WHERE"))
        return { rowCount: cuenta ? 1 : 0, rows: [] };
      if (sql.startsWith("SELECT id,cancha_id"))
        return { rowCount: parent ? 1 : 0, rows: parent ? [parent] : [] };
      if (sql.startsWith("INSERT INTO calificaciones"))
        return { rowCount: 1, rows: [{ puntuacion: params[2] }] };
      if (sql.startsWith("INSERT INTO comentarios"))
        return { rowCount: 1, rows: [{ id: "11" }] };
      if (sql.startsWith("UPDATE comentarios"))
        return { rowCount: remove, rows: [{ id: "10" }] };
      if (sql.includes("FROM comentarios_cancha m")) return { rows: comments };
      if (sql.includes("avg(puntuacion)"))
        return { rows: [{ votos: 0, promedio: 0 }] };
      return { rows: [] };
    },
  });
  return { service, calls };
}
const usuario = { id: 7, rol: "CLIENTE" };

test("comunidad rechaza calificaciones fuera del rango y valores no enteros", async () => {
  const { service } = escenario();
  for (const puntuacion of [0, 6, 2.5, "5", null]) {
    await assert.rejects(service.calificar({ id: 2, usuario, puntuacion }), {
      status: 400,
    });
  }
});
test("cada cuenta actualiza su voto mediante la clave única de cuenta y cancha", async () => {
  const { service, calls } = escenario();
  assert.deepEqual(await service.calificar({ id: 2, usuario, puntuacion: 5 }), {
    puntuacion: 5,
  });
  const insert = calls.find((call) =>
    call.sql.startsWith("INSERT INTO calificaciones"),
  );
  assert.match(insert.sql, /ON CONFLICT\(cancha_id,usuario_id\) DO UPDATE/);
  assert.deepEqual(insert.params, [2, 7, 5]);
});
test("cuentas inactivas y canchas desactivadas no pueden publicar ni calificar", async () => {
  for (const [options, status] of [
    [{ cuenta: false }, 401],
    [{ activa: false }, 409],
  ]) {
    const { service } = escenario(options);
    await assert.rejects(service.calificar({ id: 2, usuario, puntuacion: 4 }), {
      status,
    });
    await assert.rejects(
      service.publicar({
        id: 2,
        usuario,
        body: { contenido: "Un partido el sábado" },
      }),
      { status },
    );
  }
});
test("las respuestas solo pueden apuntar a mensajes vigentes de la misma cancha", async () => {
  for (const parent of [
    null,
    { cancha_id: 3 },
    { cancha_id: 2, eliminado: true },
  ]) {
    const { service } = escenario({ parent });
    await assert.rejects(
      service.publicar({
        id: 2,
        usuario,
        body: { contenido: "Me apunto", respuesta_a: 10 },
      }),
      { status: 400 },
    );
  }
});
test("publicación valida el tamaño y vincula al usuario autenticado", async () => {
  const { service, calls } = escenario();
  for (const contenido of ["", "   ", "x".repeat(1001)])
    await assert.rejects(
      service.publicar({ id: 2, usuario, body: { contenido } }),
      { status: 400 },
    );
  await service.publicar({
    id: 2,
    usuario,
    body: { contenido: "  Me apunto  ", usuario_id: 999, respuesta_a: 10 },
  });
  assert.deepEqual(
    calls.find((call) => call.sql.startsWith("INSERT INTO comentarios")).params,
    [2, 7, "Me apunto", 10],
  );
});
test("eliminar se limita al propietario o administrador y conserva el hilo", async () => {
  const { service, calls } = escenario();
  await service.eliminar({ id: 10, usuario });
  const update = calls.find((call) =>
    call.sql.startsWith("UPDATE comentarios"),
  );
  assert.deepEqual(update.params, [10, 7, false]);
  assert.match(update.sql, /usuario_id=\$2 OR \$3::boolean/);
  await assert.rejects(
    escenario({ remove: 0 }).service.eliminar({ id: 10, usuario }),
    { status: 404 },
  );
});
test("el historial pagina treinta mensajes y oculta contenido eliminado", async () => {
  const comments = Array.from({ length: 31 }, (_, n) => ({
    id: String(40 - n),
    contenido: "Mensaje",
    eliminado: n === 0,
  }));
  const { service } = escenario({ comments });
  const result = await service.consultar({ id: 2 });
  assert.equal(result.comentarios.length, 30);
  assert.equal(result.hayAnteriores, true);
  assert.equal(result.comentarios[0].id, "11");
  assert.equal(result.comentarios.at(-1).contenido, "Comentario eliminado");
  await assert.rejects(service.consultar({ id: 2, antes: "incorrecto" }), {
    status: 400,
  });
});
