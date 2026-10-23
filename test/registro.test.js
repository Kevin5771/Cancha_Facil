const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { crearServicio } = require('../src/modules/auth/service');

test('RF-01 registra datos normalizados y cifra la contraseña sin permitir elegir rol', async () => {
  const service = crearServicio({ query: async (sql, params) => {
    assert.match(sql, /INSERT INTO usuarios/);
    assert.doesNotMatch(sql.split('VALUES')[0], /rol/);
    assert.equal(params[0], 'Cliente de prueba');
    assert.equal(params[1], 'cliente@example.com');
    assert.equal(params[3], '5555-0101');
    assert.notEqual(params[2], 'PruebaRF01!');
    assert.equal(await bcrypt.compare('PruebaRF01!', params[2]), true);
    return { rows: [{ id: 1, nombre: params[0], correo: params[1], rol: 'CLIENTE' }] };
  } });
  const usuario = await service.registrar({ nombre: ' Cliente de prueba ',
    correo: 'CLIENTE@example.com', password: 'PruebaRF01!', telefono: ' 5555-0101 ', rol: 'ADMIN' });
  assert.equal(usuario.rol, 'CLIENTE');
  assert.equal(usuario.password_hash, undefined);
});

test('RF-01 rechaza datos inválidos antes de escribir en la base', async () => {
  const service = crearServicio({ query: async () => assert.fail('No debe insertar datos inválidos') });
  const valid = { nombre: 'Cliente', correo: 'cliente@example.com', password: 'PruebaRF01!' };
  for (const changes of [{ nombre: 'A' }, { correo: 'incorrecto' }, { password: 'corta' }, { telefono: 123 }]) {
    await assert.rejects(service.registrar({ ...valid, ...changes }), error => error.status === 400);
  }
});
