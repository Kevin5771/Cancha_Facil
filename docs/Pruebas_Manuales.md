# Pruebas ejecutadas y guía de validación

Fecha de cierre: **21 de octubre de 2026**, zona America/Guatemala. Las comprobaciones siguientes se ejecutaron contra el servidor y PostgreSQL locales mediante scripts de navegador y API; no se presentan como sesiones manuales del equipo ni como validación de producción.

## Resultados de integración

- **PM-01, registro:** aprobada. Registro válido y rechazo del correo duplicado.
- **PM-02, acceso y roles:** aprobada. Acceso válido, rechazo de contraseña incorrecta y bloqueo del panel para CLIENTE.
- **PM-03, catálogo:** aprobada. Una cancha desactivada desaparece; al reactivarla vuelve al catálogo.
- **PM-04, disponibilidad:** aprobada. Se consultan franjas; bloquearlas impide reservar y cancelar libera la disponibilidad.
- **PM-05, reserva ocupada:** aprobada. La creación concurrente devuelve una respuesta 201 y otra 409.
- **PM-06, concurrencia:** aprobada. PostgreSQL excluye reservas simultáneas sobre una franja y también horarios semanales activos que se cruzan.
- **PM-07, privacidad de reservas:** aprobada. Los listados de dos clientes coinciden exactamente con sus filas en la base.
- **PM-08, cancelación:** aprobada. Una cuenta ajena no puede cancelar; el propietario cancela y la franja queda libre.
- **PM-09, administración de canchas:** aprobada. Alta desde la interfaz, edición de campos, validación de tarifa, persistencia tras recarga, desactivación y reactivación. Dos envíos simultáneos del formulario producen una sola petición. Un fallo HTTP simulado conserva los datos y permite reintentar.
- **PM-10, horarios:** aprobada. Franjas consecutivas válidas, superposición rechazada, bloqueo y reactivación. Reactivar una franja que se cruza con otra se rechaza.
- **PM-11, estados:** aprobada. Confirmación, cancelación y finalización válidas. Reconfirmar, finalizar antes de tiempo y revivir una cancelada son rechazados.
- **PM-12, filtros:** aprobada. Combinación por fecha/cancha/estado, filtro por cliente y listado sin filtros.
- **PM-13, resumen:** aprobada. Todos los conteos de la API se contrastaron con una consulta directa a PostgreSQL.
- **PM-14, reinicio:** aprobada. Se detuvo y arrancó el proceso; el catálogo devolvió HTTP 200 y las huellas SHA-256 del contenido de las seis tablas fueron idénticas antes y después.
- **PM-15, rutas protegidas:** aprobada. Una petición sin sesión recibe 401 y un cliente sin rol administrativo recibe 403.

`npm run test:admin` ejecuta los casos administrativos y usa una cancha y un usuario exclusivos de prueba que elimina al terminar. `npm run test:ui` mantiene el recorrido cliente desde navegador. Los registros cancelados de estos últimos recorridos pueden permanecer como historial de prueba; las nueve canchas originales se conservan.

## Formularios y accesibilidad

- Los campos inválidos muestran instrucciones junto al control, foco y vínculos accesibles.
- Los errores del servidor permanecen dentro del formulario; los valores escritos no se borran.
- Los botones indican progreso y rechazan envíos repetidos mientras se guarda.
- Las tablas permiten desplazamiento horizontal con foco de teclado.
- La administración se verificó a 320, 390 y 768 píxeles sin desbordamiento de la página.
- `npm run test:accesibilidad` no detectó violaciones en las 14 combinaciones de vista/tema/tamaño revisadas con axe y reglas WCAG 2 A/AA y 2.1 AA. Esto no equivale a una certificación ni sustituye pruebas manuales con lector de pantalla.

## Comunidad y conversaciones largas

`npm run test:comunidad` verifica el voto por cuenta, publicación, respuesta, persistencia, lectura entre pestañas, historial paginado, separadores de día, permisos y conservación de la respuesta cuando se elimina su mensaje original. `npm run test:chat` verifica borradores, búsqueda en mensajes cargados, Ctrl + Enter, posición de lectura, aviso de nuevos mensajes y recuperación de errores de envío. Las publicaciones de prueba se eliminan lógicamente al finalizar.

## Respaldo y recuperación

Se ejecutaron `npm run db:respaldo`, `npm run db:verificar-respaldo` y `npm run db:restaurar -- archivo.dump`. Se recuperó una copia consultable en una base independiente. La verificación temporal comparó las seis tablas y no modificó la base original. Ver [Respaldos](Respaldos.md) para repetir el procedimiento.

## Evidencia real disponible

En `.local/walkthrough/`:

- `administracion_resultados.json`: casos y resultados de administración.
- `accesibilidad_resultados.json`: reglas y resultados por vista, tema y tamaño.
- `persistencia_antes.json` y `persistencia_resultado.json`: huellas de datos y resultado del reinicio.
- `formulario_error_conserva_datos.png`: respuesta del formulario al fallo HTTP inyectado.
- `administracion_movil_verificada.png`: interfaz administrativa en pantalla pequeña.
- `catalogo_escritorio.png`, `catalogo_movil.png`, `la_grada_final.png`: vistas verificadas de la aplicación.

No se adjuntan commits o capturas de herramientas que no se hayan generado. La [guía de entrega](Entrega.md) describe el recorrido de demostración y los límites de la versión.
