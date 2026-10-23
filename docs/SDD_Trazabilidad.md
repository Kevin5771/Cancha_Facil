# Trazabilidad SDD - CanchaFácil (Parte 4)

## Cierre verificado del 21/10/2026

HU-08/HU-09/HU-10/HU-11/HU-12 quedaron verificadas en el recorrido administrativo real, junto con los flujos de registro, propiedad de reservas y concurrencia. `test:admin` contrasta los datos persistidos, filtros y conteos con PostgreSQL. Se corrigió la comparación de HH:MM y HH:MM:SS y se añadió la exclusión de horarios semanales activos en el esquema.

La presentación compartida de formularios usa `public/forms.js` y `public/polish.css`; mantiene los valores ante errores, muestra validación accesible y evita dobles envíos. El chat agrega separadores de fecha y conserva las referencias a mensajes eliminados. El arranque se unifica con `npm run levantar` y las herramientas de respaldo se documentan en [Respaldos](Respaldos.md).

Estado ejecutado: 25 pruebas unitarias/de contrato aprobadas, recorridos de navegador y administración aprobados, 14 combinaciones de accesibilidad sin violaciones automáticas, copia de respaldo recuperada y persistencia verificada después de reiniciar. Véanse [Pruebas](Pruebas_Manuales.md) y [Entrega](Entrega.md). Las cifras históricas de apartados anteriores corresponden a sus fechas de ejecución, no al cierre actual.

## Ampliación del 21/10/2026: Luna y La grada

Se añaden especificaciones nuevas a petición del usuario; no se atribuyen a los PDF originales:

- HU-13: consultar conversaciones por cancha, publicar y responder mensajes. Módulo `src/modules/comunidad/`, interfaz `public/community.js`. Consulta pública; cuenta y cancha activas para escribir; 1 a 1000 caracteres; historial paginado y actualización cada 15 segundos.
- HU-14: calificar una cancha con 1 a 5 estrellas, actualizar la calificación propia y consultar promedio y distribución. Una calificación por cuenta y cancha, impuesta también por PostgreSQL. El catálogo muestra el promedio real de los votos almacenados.
- HU-15: eliminar comentarios propios; ADMIN puede moderar. Eliminación lógica que conserva las respuestas. Una cuenta no puede eliminar publicaciones ajenas.
- HU-16: cambiar entre modo claro y oscuro con persistencia local; usar menús personalizados con teclado, Escape, foco y selección visible. Archivos `public/theme.js`, `public/selects.js` y `public/luna.css`.
- Datos de demostración: novena cancha Cancha Luna, tarifa de referencia Q185 y franjas semanales 07:00 a 22:00. `npm run datos-comunidad` agrega la cancha y ejemplos ficticios sin borrar los datos anteriores.

Verificación: `test/comunidad.test.js` comprueba límites, acceso, respuestas, propiedad, voto único y paginación; `npm run test:comunidad` ejecuta el flujo en navegador y verifica persistencia, actualización entre pestañas, modo oscuro, selectores y móvil. Se mantiene `npm run test:ui` para el flujo de reservas. Consultar [arquitectura C4](Arquitectura_C4.md) para el componente y sus dependencias.

**Origen:** propuesta aprobada (RF-01 a RF-13), Parte 2 (HU-01 a HU-12), Parte 3 (arquitectura en capas y 4 entidades).

| HU | RF | Especificación principal | Diseño/implementación | Verificación |
|---|---|---|---|---|
| HU-01 | RF-01 | Crear cliente con correo único y contraseña segura | `src/modules/auth/`, `usuarios` | TU-01 (correo), PM-01 registro |
| HU-02 | RF-02 | Inicio de sesión y control de rol | `src/shared/session.js`, `src/modules/auth/` | PM-02 login y rol |
| HU-03 | RF-03 | Ver solo canchas activas | `src/modules/canchas/`, catálogo UI | PM-03 catálogo |
| HU-04 | RF-04 | Horarios libres para cancha/fecha | `GET /api/canchas/:id/disponibilidad` | TU-03/TU-04/TU-07, PM-04 |
| HU-05 | RF-05, RF-06 | Reserva válida sin solapamiento concurrente | `src/modules/reservas/`, `reservas_sin_solapamiento` en SQL | TU-05/TU-06, PM-05 y PM-06 |
| HU-06 | RF-07 | Ver solo reservas propias | `GET /api/reservaciones/mias` | PM-07 |
| HU-07 | RF-08 | Cancelar solo reserva propia y liberar franja | `PATCH /api/reservaciones/:id/cancelar` | PM-08 |
| HU-08 | RF-09 | CRUD de canchas y activar/desactivar | `src/modules/canchas/`, formulario admin | PM-09 |
| HU-09 | RF-10 | Alta y bloqueo de horarios por cancha | `src/modules/horarios/` | PM-10 |
| HU-10 | RF-11 | Confirmar/cancelar/finalizar por admin | `src/modules/admin/` | PM-11 |
| HU-11 | RF-12 | Filtrar reservas por fecha/cancha/cliente/estado | `GET /api/admin/reservaciones` | PM-12 |
| HU-12 | RF-13 | Resumen de reservaciones | `GET /api/admin/resumen` | PM-13 |

## Decisiones de diseño relevantes

- **D-01:** Node.js + Express, por ajustarse a la tecnología sugerida en la propuesta.
- **D-02:** PostgreSQL y consultas parametrizadas (`pg`) en vez de Sequelize. La propuesta permite Sequelize opcionalmente y SQL directo facilita la restricción de exclusión GiST.
- **D-03:** Franjas semanales (`horarios`) con `dia_semana`, hora de inicio y fin; cada reservación copia las horas y fecha para preservar el historial.
- **D-04:** Restricción SQL `EXCLUDE USING gist` con rango semiabierto `[)` para bloquear traslapes en la base de datos, incluso frente a concurrencia.
- **D-05:** Cookies `HttpOnly` de 8 horas, contraseñas bcrypt y roles CLIENTE/ADMIN.
- **D-06:** Sin pagos, mensajería externa ni app móvil, conforme al alcance de la propuesta aprobada.
- **D-07:** El administrador se crea con script separado; el registro público solo otorga CLIENTE.

## Tareas e implementación

| Tarea | Qué se implementó | Artefacto |
|---|---|---|
| T-01 | Modelo de datos y reglas de integridad | `database/schema.sql` |
| T-02 | Autenticación y roles | `src/modules/auth/`, `src/shared/session.js` |
| T-03 | CRUD de canchas y disponibilidad | `src/modules/canchas/` |
| T-04 | Configuración de horarios | `src/modules/horarios/` |
| T-05 | Reservaciones y cancelaciones | `src/modules/reservas/` |
| T-06 | Administración/filtros/resumen | `src/modules/admin/` |
| T-07 | Frontend responsive | `public/` |
| T-08 | Pruebas básicas | `test/helpers.test.js` |
| T-09 | Datos de prueba e instrucciones | `scripts/`, `README.md` |

## Evidencia de IA (completar con evidencia real)

Registro inicial: se utilizó asistencia de IA para estructurar módulos, crear borradores de código, proponer validaciones y diseñar los casos de prueba. El equipo debe revisar y probar el código antes de declararlo aceptado. Para cada cambio importante, anotar: fecha, especificación, indicación/prompt, propuesta de IA, corrección del equipo, commit y resultado de la prueba. No incluir capturas ni resultados no realizados.

## Reestructuración C4 (20/10/2026)

[Arquitectura C4](Arquitectura_C4.md) documenta los cuatro niveles y su correspondencia con el código. Cada módulo separa `routes.js`, `service.js` y `repository.js`. `src/server.js` inicia el proceso y `src/app.js` compone la aplicación. El acceso PostgreSQL reside en `src/infrastructure/database/postgres.js`.

HU-01/HU-02 incluyen la cuenta de usuario en `auth`; HU-04 incluye disponibilidad en `canchas`; HU-12 incluye reportes básicos en `admin`. Estas responsabilidades no necesitan procesos separados para el MVP.

Validación ejecutada: `npm test`, 17 pruebas aprobadas, cero fallidas (incluidos cuatro subtests HTTP). Se verificaron validaciones, permisos HTTP, propietario de reserva, confirmación, reversión y liberación de conexión con adaptador simulado. No se ejecutaron PM-01 a PM-15 contra PostgreSQL real.
