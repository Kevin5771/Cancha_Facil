// Crea configuración de desarrollo sin imprimir credenciales en consola.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const local = path.join(root, '.local');
fs.mkdirSync(local, { recursive: true });
const envPath = path.join(root, '.env');
let config = fs.existsSync(envPath)
  ? fs.readFileSync(envPath, 'utf8')
  : fs.readFileSync(path.join(root, '.env.example'), 'utf8');
if (fs.existsSync(path.join(local, 'postgres', 'PG_VERSION'))) {
  throw new Error('La instancia local ya existe; usa su configuración actual.');
}
const password = crypto.randomBytes(32).toString('hex');
const adminPassword = crypto.randomBytes(18).toString('base64url');
const values = {
  DATABASE_URL: `postgresql://canchafacil:${password}@127.0.0.1:5433/canchafacil`,
  JWT_SECRET: crypto.randomBytes(48).toString('hex'),
  ADMIN_EMAIL: 'admin@canchafacil.local',
  ADMIN_PASSWORD: adminPassword,
};
for (const [key, value] of Object.entries(values)) {
  const expression = new RegExp(`^${key}=.*$`, 'm');
  config = expression.test(config)
    ? config.replace(expression, `${key}=${value}`)
    : `${config}\n${key}=${value}\n`;
}
fs.writeFileSync(envPath, config);
fs.writeFileSync(path.join(local, 'init-password.txt'), password);
console.log('Configuración local preparada; credenciales guardadas en .env.');
