require('dotenv').config();
const { chromium, expect } = require('@playwright/test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pool } = require('../src/infrastructure/database/postgres');
async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1080 }, reducedMotion: 'reduce' });
  let original;
  try {
    const login = await context.request.post('http://localhost:3000/api/auth/login', { data: { correo: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD } });
    assert.equal(login.status(), 200);
    const courts = (await (await context.request.get('http://localhost:3000/api/canchas/admin')).json()).canchas;
    original = courts.find(c => c.nombre === 'Cancha Luna') || courts[0];
    const page = await context.newPage();
    await page.goto('http://localhost:3000');
    await page.locator('.admin-menu summary').click();
    await page.locator('.admin-menu [data-view="canchas-admin"]').click();
    await page.locator(`[data-action="editar-cancha"][data-id="${original.id}"]`).click();
    await expect(page.locator('#can-nombre')).toHaveValue(original.nombre);
    console.log('Tipo del identificador del formulario:', await page.locator('#form-cancha').evaluate(f => typeof f.id));
    const description = `${original.descripcion} Verificación de edición.`;
    await page.locator('#can-desc').fill(description);
    await page.locator('#can-tarifa').fill('199.50');
    const saved = page.waitForResponse(r => r.url().endsWith(`/api/canchas/${original.id}`) && r.request().method() === 'PUT', { timeout: 5000 });
    await page.locator('#form-cancha button[type="submit"]').click();
    assert.equal((await saved).status(), 200);
    const stored = (await pool.query('SELECT descripcion,tarifa_referencia FROM canchas WHERE id=$1', [original.id])).rows[0];
    assert.equal(stored.descripcion, description);
    assert.equal(Number(stored.tarifa_referencia), 199.5);
    await page.reload();
    await page.locator('.admin-menu summary').click();
    await page.locator('.admin-menu [data-view="canchas-admin"]').click();
    await page.locator(`[data-action="editar-cancha"][data-id="${original.id}"]`).click();
    await expect(page.locator('#can-desc')).toHaveValue(description);
    await expect(page.locator('#can-tarifa')).toHaveValue('199.50');
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.resolve(__dirname, '../.local/walkthrough/edicion_cancha_guardada.png'), fullPage: true });
    await page.locator('[data-action="limpiar-cancha"]').click();
    await expect(page.locator('#can-nombre')).toHaveValue('');
    await expect(page.locator('#titulo-form-cancha')).toHaveText('Nueva cancha');
    await page.evaluate(() => document.fonts.ready);
    console.log('Edición, persistencia PostgreSQL, recarga y limpieza del formulario verificadas.');
  } finally {
    if (original) await context.request.put(`http://localhost:3000/api/canchas/${original.id}`, { data: { nombre: original.nombre, tipo: original.tipo, descripcion: original.descripcion, tarifa_referencia: original.tarifa_referencia == null ? null : Number(original.tarifa_referencia), activa: original.activa } });
    await context.close(); await browser.close(); await pool.end();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
