# Cierre de CanchaFácil - 21 de octubre de 2026

## Qué incluye la entrega

Aplicación web con catálogo de nueve canchas ficticias, cuentas de prueba, reservaciones, administración, La grada, modos claro/oscuro, footer interactivo y arquitectura C4 documentada. Se mantienen los seis módulos de backend y las tecnologías de la base del proyecto.

Las pruebas de cierre usan una cancha y un usuario temporales y eliminan exclusivamente esos datos al terminar. Los recorridos del chat y de reservas conservan registros cancelados o eliminados lógicamente como evidencia de sus acciones. No se inventan clientes comerciales, valoraciones auténticas ni resultados de pruebas.

## Arranque para la demostración

Desde la carpeta del proyecto, con las dependencias instaladas y el `.env` existente:

```powershell
npm run levantar
```

El comando enciende PostgreSQL local y abre el servidor en la terminal. Si la aplicación ya responde, muestra la dirección existente. Abrir `http://localhost:3000`. Al iniciar una terminal propia para el servidor, mantenerla abierta y detenerlo con Ctrl + C.

Para actualizar el esquema de una copia anterior, ejecutar `npm run db:init` antes del arranque. El esquema incluye la exclusión de horarios semanales activos y la exclusión de reservaciones activas. La carga de datos y los scripts de usuarios siguen descritos en README; no es necesario repetirlos en cada inicio.

## Recorrido de presentación

1. Mostrar el catálogo, filtros por deporte, orden por precio, vista móvil y cambio de tema.
2. Ingresar como administrador y crear una cancha; editar nombre, tipo, descripción, tarifa y estado. Mostrar el cambio persistido después de recargar.
3. Configurar dos horarios consecutivos. Intentar agregar uno superpuesto, bloquear una franja y comprobar que desaparece de disponibilidad.
4. Abrir una ventana normal y otra de incógnito, usando dos clientes de `USUARIOS_PRUEBA.txt`. Reservar una misma franja y mostrar que el segundo intento se rechaza.
5. Consultar Mis reservas, cancelar la propia y volver a consultar la franja libre. Verificar que otra cuenta no pueda cancelar esa reserva.
6. Desde administración, filtrar reservas, confirmar una pendiente y consultar el resumen. Finalizar solamente una reservación confirmada cuyo horario ya terminó.
7. Entrar en La grada: calificar, actualizar el voto, publicar, responder y eliminar el mensaje original conservando el hilo. Mostrar borradores, búsqueda y aviso de mensajes nuevos.
8. Mostrar [Arquitectura C4](Arquitectura_C4.md), [trazabilidad](SDD_Trazabilidad.md), resultados y [respaldo/restauración](Respaldos.md).

## Comprobaciones repetibles

- `npm test`: validaciones y servicios sin PostgreSQL; incluye la equivalencia entre HH:MM y TIME de PostgreSQL.
- `npm run test:admin`: administración, validación visible, conservación ante fallos, un solo envío, horarios y reservas concurrentes, propiedad, filtros, conteos del resumen y móvil.
- `npm run test:ui`: catálogo, filtros, fecha, acceso, reserva y cancelación desde navegador.
- `npm run test:comunidad`: calificaciones, publicaciones, respuestas, persistencia, actualización entre pestañas, permisos y temas.
- `npm run test:chat`: siete accesos del TXT, borradores, búsqueda, lectura sin saltos, errores recuperables y Ctrl + Enter.
- `npm run test:accesibilidad`: comprobaciones automáticas WCAG 2 A/AA y 2.1 AA con axe en las vistas y tamaños documentados en el resultado. No sustituye una evaluación manual con tecnologías de asistencia.
- `npm run db:verificar-respaldo`: exporta y restaura una copia temporal; compara las seis tablas en un período sin escrituras concurrentes y conserva intacta la base original.

Las capturas y resultados estructurados se guardan en `.local/walkthrough/`. Incluyen `administracion_resultados.json`, `accesibilidad_resultados.json`, `persistencia_resultado.json`, `formulario_error_conserva_datos.png` y las capturas de catálogo y comunidad. El informe [Pruebas_Manuales.md](Pruebas_Manuales.md) distingue los casos que ya tienen evidencia ejecutada.

## Límites de esta entrega

La versión está preparada para pruebas y presentación local. El listado administrativo mantiene un máximo de 500 reservas. La conversación consulta cambios cada 15 segundos; la búsqueda cubre los mensajes cargados y los borradores permanecen en el dispositivo. El resumen usa las métricas existentes y no incorpora informes por períodos arbitrarios.

El despliegue público, correo de recuperación de contraseña, pagos y servicios de mensajería externos no forman parte de este cierre. Las credenciales, datos de PostgreSQL, respaldos y TXT de pruebas se excluyen de Git; preparar la configuración del equipo receptor por separado.
