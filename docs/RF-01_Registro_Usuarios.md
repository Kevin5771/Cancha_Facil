# RF-01 — Registro de usuarios

El sistema permite crear una cuenta de cliente con nombre, correo, contraseña y teléfono opcional.

## Implementación

- Interfaz: formulario de registro en `public/app.js`, con validaciones y errores visibles mediante `public/forms.js`.
- Endpoint: `POST /api/auth/registro`, definido en `src/modules/auth/routes.js`.
- Reglas de aplicación: `src/modules/auth/service.js` valida los datos, normaliza nombre/correo y cifra la contraseña con bcrypt.
- Persistencia: `src/modules/auth/repository.js` utiliza SQL parametrizado sobre `usuarios`, definido en `database/schema.sql`.
- El registro público crea clientes; no permite solicitar permisos de administrador. La respuesta no incluye la contraseña ni su hash.
- Un registro correcto responde HTTP 201 e inicia sesión mediante cookie HttpOnly. Los datos inválidos responden 400 y un correo duplicado responde 409.

La separación de interfaz, rutas, servicio y repositorio sigue el monolito modular descrito en [Arquitectura C4](Arquitectura_C4.md).

## Verificación

Ejecutar `npm test`. Las pruebas específicas están en `test/registro.test.js`: normalización, cifrado, protección del rol y rechazo de datos inválidos antes de insertar.

Para probar manualmente: abrir el formulario de registro, crear una cuenta con un correo nuevo y verificar el inicio de sesión. Repetir el correo y comprobar que se muestra un conflicto sin crear una segunda cuenta.

Este primer commit incorpora la base ejecutable del proyecto, que también contiene los demás módulos existentes de CanchaFácil.
